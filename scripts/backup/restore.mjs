#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  assertConfirmation,
  loadAndValidateManifest,
  npxCommand,
  parseArgs,
  requireEnvironment,
  requireString,
  runCommand,
} from "./lib.mjs";

const HELP = `Plan or execute a destructive Convex snapshot restore.

Usage (plan only):
  npm run backup:restore -- --manifest <path> --deployment <target> --environment <environment>

Execution adds:
  --execute --confirm "RESTORE-<ENVIRONMENT>:<target>"

Production additionally requires a separately validated pre-restore backup:
  --pre-restore-manifest <path>
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);
  const manifestPath = requireString(args, "manifest");
  const deployment = requireString(args, "deployment");
  const environment = requireEnvironment(requireString(args, "environment"));
  const source = await loadAndValidateManifest(
    manifestPath,
    typeof args.archive === "string" ? args.archive : undefined,
  );
  if (!source.manifest.includesFileStorage) {
    throw new Error("Full recovery requires a backup that includes Convex file storage.");
  }
  if (environment === "production" && source.manifest.environment !== "production") {
    throw new Error(
      "Production restore requires a source manifest created from a production deployment.",
    );
  }

  console.log(`Source: ${source.archivePath}`);
  console.log(`Target: ${environment}/${deployment}`);
  console.log("Mode: replace-all (tables absent from the snapshot will be deleted)");
  console.log(
    "File-storage note: Convex restores missing snapshot files but does not delete unrelated existing files.",
  );

  if (!args.execute) {
    console.log(
      "PLAN ONLY: no deployment data was changed. Complete the runbook approvals, then add --execute and --confirm.",
    );
    return;
  }

  assertConfirmation(args.confirm, `RESTORE-${environment.toUpperCase()}:${deployment}`);
  if (environment === "production") {
    const preRestorePath = requireString(args, "pre-restore-manifest");
    const preRestore = await loadAndValidateManifest(preRestorePath);
    if (
      preRestore.manifest.deployment !== deployment ||
      preRestore.manifest.environment !== "production"
    ) {
      throw new Error("Pre-restore backup must identify the same production deployment target.");
    }
    const preRestoreAge = Date.now() - Date.parse(preRestore.manifest.createdAt);
    if (
      !Number.isFinite(preRestoreAge) ||
      preRestoreAge < 0 ||
      preRestoreAge > 4 * 60 * 60 * 1000
    ) {
      throw new Error(
        "Production pre-restore backup must have been created within the last four hours.",
      );
    }
  }

  await runCommand(npxCommand(), [
    "convex",
    "import",
    "--deployment",
    deployment,
    "--replace-all",
    "--yes",
    source.archivePath,
  ]);
  const receiptPath = resolve(dirname(resolve(manifestPath)), `restore-${Date.now()}.receipt.json`);
  await writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        receiptVersion: 1,
        completedAt: new Date().toISOString(),
        targetDeployment: deployment,
        targetEnvironment: environment,
        sourceArchiveSha256: source.manifest.archive.sha256,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  console.log(`Restore completed. Receipt: ${receiptPath}`);
  console.log(
    "Required next step: export the target and run backup:verify-restore before reopening writes.",
  );
}

main().catch((error) => {
  console.error(`Restore aborted: ${error.message}`);
  process.exitCode = 1;
});
