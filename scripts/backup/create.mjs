#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertConfirmation,
  createManifest,
  inspectConvexArchive,
  npxCommand,
  parseArgs,
  requireEnvironment,
  requireString,
  runCommand,
  safeArtifactName,
} from "./lib.mjs";

const HELP = `Create and validate a Convex backup with file storage.

Usage:
  npm run backup:create -- --deployment <reference> --environment <development|staging|production> [options]

Options:
  --output-dir <path>  Artifact directory (default: backups)
  --confirm <phrase>   Required for production: BACKUP-PRODUCTION:<deployment>
  --help               Show this message
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);
  const deployment = requireString(args, "deployment");
  const environment = requireEnvironment(requireString(args, "environment"));
  if (environment === "production") {
    assertConfirmation(args.confirm, `BACKUP-PRODUCTION:${deployment}`);
  }

  const outputDirectory = resolve(
    typeof args["output-dir"] === "string" ? args["output-dir"] : "backups",
  );
  await mkdir(outputDirectory, { recursive: true });
  const createdAt = new Date().toISOString();
  const stamp = createdAt.replaceAll(":", "-").replaceAll(".", "-");
  const baseName = `saknaha-${environment}-${safeArtifactName(deployment)}-${stamp}`;
  const archivePath = resolve(outputDirectory, `${baseName}.zip`);
  const manifestPath = resolve(outputDirectory, `${baseName}.manifest.json`);

  await runCommand(npxCommand(), [
    "convex",
    "export",
    "--deployment",
    deployment,
    "--include-file-storage",
    "--path",
    archivePath,
  ]);
  const inventory = await inspectConvexArchive(archivePath);
  if (!inventory.storage.included)
    throw new Error("Export completed without file-storage metadata.");
  const manifest = await createManifest({
    archivePath,
    deployment,
    environment,
    inventory,
    createdAt,
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  console.log(`Backup validated: ${archivePath}`);
  console.log(`Manifest written: ${manifestPath}`);
}

main().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
});
