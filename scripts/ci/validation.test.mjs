import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";

function run(script, args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
  });
}

function runAsync(script, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

describe("CI/CD validation commands", () => {
  it("accepts a complete production deployment environment without printing secrets", () => {
    const secret = "test-token-that-must-not-be-printed";
    const result = run(
      "scripts/ci/validate-environment.mjs",
      ["--environment", "production", "--source", "ci"],
      {
        CONVEX_DEPLOY_KEY: secret,
        VERCEL_TOKEN: secret,
        VERCEL_ORG_ID: "team-id",
        VERCEL_PROJECT_ID: "project-id",
        APP_HEALTH_URL: "https://saknaha.example",
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("validation passed");
    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
  });

  it("fails closed when a required deployment secret is absent", () => {
    const result = run(
      "scripts/ci/validate-environment.mjs",
      ["--environment", "staging", "--source", "ci"],
      {
        CONVEX_DEPLOY_KEY: "test",
        VERCEL_TOKEN: "test",
        VERCEL_ORG_ID: "team-id",
        VERCEL_PROJECT_ID: "project-id",
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("APP_HEALTH_URL");
  });

  it("rejects non-semantic and mismatched release versions", () => {
    const malformed = run("scripts/ci/validate-release.mjs", [
      "--version",
      "release-latest",
      "--sha",
      "a".repeat(40),
    ]);
    const mismatched = run("scripts/ci/validate-release.mjs", [
      "--version",
      "v99.0.0",
      "--sha",
      "a".repeat(40),
    ]);
    expect(malformed.status).not.toBe(0);
    expect(malformed.stderr).toContain("semantic tag");
    expect(mismatched.status).not.toBe(0);
    expect(mismatched.stderr).toContain("does not match package version");
  });

  it("verifies a deployed SPA shell, headers, route fallback, and immutable asset", async () => {
    const headers = {
      "content-security-policy": "default-src 'self'",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "permissions-policy": "microphone=()",
    };
    const server = createServer((request, response) => {
      if (request.url === "/assets/index-test.js") {
        response.writeHead(200, {
          "content-type": "text/javascript",
          "cache-control": "public, max-age=31536000, immutable",
        });
        response.end("console.log('healthy')");
        return;
      }
      response.writeHead(200, { "content-type": "text/html", ...headers });
      response.end('<div id="root"></div><script src="/assets/index-test.js"></script>');
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    try {
      const result = await runAsync("scripts/ci/verify-health.mjs", [
        "--url",
        `http://127.0.0.1:${address.port}`,
      ]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("health verification passed");
    } finally {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
