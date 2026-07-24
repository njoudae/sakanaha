#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

function value(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const version = value("version");
  const expectedSha = value("sha");
  if (!version || !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("Release version must be a semantic tag such as v1.2.3.");
  }
  if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) {
    throw new Error("Release SHA must be the full 40-character commit SHA.");
  }
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  if (version !== `v${packageJson.version}`) {
    throw new Error(
      `Release tag ${version} does not match package version v${packageJson.version}.`,
    );
  }
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (head.toLowerCase() !== expectedSha.toLowerCase()) {
    throw new Error(`Checked-out commit ${head} does not match approved SHA ${expectedSha}.`);
  }
  try {
    execFileSync("git", ["rev-parse", "--verify", `refs/tags/${version}`], { stdio: "ignore" });
    throw new Error(`Release tag ${version} already exists.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) throw error;
  }
  console.log(`Release validation passed for ${version} at ${head}.`);
}

main().catch((error) => {
  console.error(`Release validation failed: ${error.message}`);
  process.exitCode = 1;
});
