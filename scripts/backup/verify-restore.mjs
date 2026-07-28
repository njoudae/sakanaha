#!/usr/bin/env node
import { compareInventories, loadAndValidateManifest, parseArgs, requireString } from "./lib.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: npm run backup:verify-restore -- --source-manifest <path> --restored-manifest <path>",
    );
    return;
  }
  const source = await loadAndValidateManifest(requireString(args, "source-manifest"));
  const restored = await loadAndValidateManifest(requireString(args, "restored-manifest"));
  const differences = compareInventories(source.inventory, restored.inventory);
  if (differences.length > 0)
    throw new Error(`Restore verification failed:\n- ${differences.join("\n- ")}`);
  console.log(
    "RESTORE VERIFIED: table contents and stored-file inventory match the source backup.",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
