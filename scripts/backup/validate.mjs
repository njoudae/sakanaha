#!/usr/bin/env node
import { loadAndValidateManifest, parseArgs, requireString } from "./lib.mjs";

const HELP = `Validate a Convex backup against its immutable manifest.

Usage:
  npm run backup:validate -- --manifest <path> [--archive <path>]
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);
  const manifestPath = requireString(args, "manifest");
  const archivePath = typeof args.archive === "string" ? args.archive : undefined;
  const result = await loadAndValidateManifest(manifestPath, archivePath);
  const documentCount = Object.values(result.inventory.tables).reduce(
    (sum, table) => sum + table.documents,
    0,
  );
  console.log(`VALID: ${result.archivePath}`);
  console.log(
    `Tables: ${Object.keys(result.inventory.tables).length}; documents: ${documentCount}; stored files: ${result.inventory.storage.fileEntries}`,
  );
}

main().catch((error) => {
  console.error(`INVALID: ${error.message}`);
  process.exitCode = 1;
});
