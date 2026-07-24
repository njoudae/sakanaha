#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";

const requiredWorkflows = [
  ".github/workflows/quality-gates.yml",
  ".github/workflows/deploy-staging.yml",
  ".github/workflows/release-production.yml",
];

async function readYaml(path) {
  return parse(await readFile(path, "utf8"));
}

function rejectUnsafeRunInterpolation(workflow, label) {
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (
        typeof step.run === "string" &&
        /\$\{\{\s*(?:inputs\.|steps\.[^.]+\.outputs\.)/.test(step.run)
      ) {
        throw new Error(
          `${label}/${jobName} interpolates untrusted input directly in a run script.`,
        );
      }
    }
  }
}

function requirePinnedActions(workflow, label) {
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (typeof step.uses === "string" && !/@[0-9a-f]{40}$/i.test(step.uses)) {
        throw new Error(
          `${label}/${jobName} uses a GitHub Action that is not pinned to a commit SHA.`,
        );
      }
    }
  }
}

function requireRunSteps(job, commands) {
  const runs = (job?.steps ?? []).map((step) => step.run ?? "").join("\n");
  for (const command of commands) {
    if (!runs.includes(command))
      throw new Error(`Workflow is missing required command: ${command}`);
  }
}

async function validateArtifact() {
  const dist = resolve("apps/web/dist");
  const html = await readFile(resolve(dist, "index.html"), "utf8");
  if (!html.includes('id="root"'))
    throw new Error("Production artifact is missing the React root.");
  const assets = await readdir(resolve(dist, "assets"));
  if (!assets.some((name) => /^index-.*\.js$/.test(name))) {
    throw new Error("Production artifact is missing its hashed entry chunk.");
  }
  if (assets.some((name) => name.endsWith(".map"))) {
    throw new Error("Production artifact contains source maps that were not removed after upload.");
  }
}

function dotenvValue(contents, key) {
  const line = contents.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim();
}

async function main() {
  const gitignore = await readFile(".gitignore", "utf8");
  if (!gitignore.split(/\r?\n/).includes(".vercel/")) {
    throw new Error(
      ".vercel must be ignored because it contains linked project and pulled environment data.",
    );
  }
  const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
  if (vercel.outputDirectory !== "apps/web/dist")
    throw new Error("Unexpected Vercel output directory.");
  if (vercel.buildCommand !== "npm run typecheck && npm run build") {
    throw new Error("Vercel builds must not deploy Convex implicitly.");
  }
  const globalHeaders = vercel.headers?.find((entry) => entry.source === "/(.*)")?.headers ?? [];
  const headerNames = new Set(globalHeaders.map((header) => header.key));
  for (const required of [
    "Content-Security-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
  ]) {
    if (!headerNames.has(required))
      throw new Error(`Missing production security header: ${required}`);
  }

  for (const workflow of requiredWorkflows) await access(workflow);
  const quality = await readYaml(requiredWorkflows[0]);
  const staging = await readYaml(requiredWorkflows[1]);
  const production = await readYaml(requiredWorkflows[2]);
  rejectUnsafeRunInterpolation(quality, "quality");
  rejectUnsafeRunInterpolation(staging, "staging");
  rejectUnsafeRunInterpolation(production, "production");
  requirePinnedActions(quality, "quality");
  requirePinnedActions(staging, "staging");
  requirePinnedActions(production, "production");
  if (
    !quality.on ||
    !("pull_request" in quality.on) ||
    !("push" in quality.on) ||
    !("workflow_dispatch" in quality.on)
  ) {
    throw new Error(
      "Quality Gates must run for pull requests, main pushes, and manual validation.",
    );
  }
  if (!staging.on?.workflow_run || !staging.on.workflow_run.branches?.includes("main")) {
    throw new Error("Staging must be triggered by a successful main Quality Gates run.");
  }
  if (
    !production.on?.workflow_dispatch?.inputs?.version ||
    !production.on.workflow_dispatch.inputs.commit_sha
  ) {
    throw new Error("Production release must require explicit version and commit SHA inputs.");
  }
  requireRunSteps(quality.jobs?.quality, [
    "npm run lint",
    "npm run typecheck",
    "npm test",
    "npm run test:security",
    "npm audit --audit-level=low",
    "npm run build",
  ]);
  if (staging.jobs?.deploy?.environment !== "staging") {
    throw new Error("Staging deployment must use the staging GitHub environment.");
  }
  if (production.jobs?.release?.environment !== "production") {
    throw new Error("Production release must use the production GitHub environment.");
  }
  requireRunSteps(staging.jobs?.deploy, ["convex deploy", "vercel@56.3.1", "verify-health.mjs"]);
  requireRunSteps(production.jobs?.release, [
    "validate-release.mjs",
    "convex deploy",
    "vercel@56.3.1",
    "verify-health.mjs",
    "gh release create",
  ]);

  const productionSteps = production.jobs?.release?.steps ?? [];
  const healthIndex = productionSteps.findIndex(
    (step) => step.name === "Verify production alias health",
  );
  const tagIndex = productionSteps.findIndex(
    (step) => step.name === "Create immutable release tag and GitHub release",
  );
  if (healthIndex < 0 || tagIndex <= healthIndex) {
    throw new Error("Production tagging must occur only after canonical health verification.");
  }

  const stagingTemplate = await readFile(".env.staging.example", "utf8");
  const productionTemplate = await readFile(".env.production.example", "utf8");
  for (const key of ["VITE_CONVEX_URL", "CONVEX_SITE_URL", "SITE_URL", "SAKNAHA_APP_URL"]) {
    if (dotenvValue(stagingTemplate, key) === dotenvValue(productionTemplate, key)) {
      throw new Error(`${key} must differ between staging and production templates.`);
    }
  }

  if (process.argv.includes("--artifact")) await validateArtifact();
  console.log("Deployment and GitHub Actions validation passed.");
}

main().catch((error) => {
  console.error(`Deployment validation failed: ${error.message}`);
  process.exitCode = 1;
});
