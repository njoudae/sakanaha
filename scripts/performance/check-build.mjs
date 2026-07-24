#!/usr/bin/env node
import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";

const DIST_DIRECTORY = resolve("apps/web/dist");
const ASSETS_DIRECTORY = resolve(DIST_DIRECTORY, "assets");
const convexAuthEnabled = process.env.VITE_FEATURE_AUTH_CONVEX_AUTH_ENABLED === "true";
const budgets = {
  entryBytes: 100_000,
  initialGzipBytes: convexAuthEnabled ? 125_000 : 110_000,
  largestJavaScriptBytes: 500_000,
  logoBytes: 20_000,
  minimumLazyPageChunks: 15,
};

function formatKilobytes(bytes) {
  return `${(bytes / 1_000).toFixed(2)} kB`;
}

async function main() {
  const html = await readFile(resolve(DIST_DIRECTORY, "index.html"), "utf8");
  const assetNames = await readdir(ASSETS_DIRECTORY);
  const initialJavaScript = [...html.matchAll(/(?:src|href)="\/assets\/([^"?]+\.js)"/g)].map(
    (match) => match[1],
  );
  const uniqueInitialJavaScript = [...new Set(initialJavaScript)];
  const entryName = uniqueInitialJavaScript.find((name) => name.startsWith("index-"));
  if (!entryName) throw new Error("Unable to identify the production entry chunk.");

  const initialBuffers = await Promise.all(
    uniqueInitialJavaScript.map((name) => readFile(resolve(ASSETS_DIRECTORY, name))),
  );
  const initialGzipBytes = initialBuffers.reduce(
    (total, contents) => total + gzipSync(contents).byteLength,
    0,
  );
  const entryBytes = (await stat(resolve(ASSETS_DIRECTORY, entryName))).size;
  const javascriptAssets = await Promise.all(
    assetNames
      .filter((name) => name.endsWith(".js"))
      .map(async (name) => ({ name, bytes: (await stat(resolve(ASSETS_DIRECTORY, name))).size })),
  );
  const largestJavaScript = javascriptAssets.sort((left, right) => right.bytes - left.bytes)[0];
  const logoName = assetNames.find((name) => name.startsWith("saknaha-logo-"));
  if (!logoName) throw new Error("Optimized Saknaha logo asset was not emitted.");
  const logoBytes = (await stat(resolve(ASSETS_DIRECTORY, logoName))).size;
  const lazyPageChunks = assetNames.filter((name) => /Page-[^.]+\.js$/.test(name)).length;

  const failures = [];
  if (entryBytes > budgets.entryBytes) {
    failures.push(`entry ${formatKilobytes(entryBytes)} > ${formatKilobytes(budgets.entryBytes)}`);
  }
  if (initialGzipBytes > budgets.initialGzipBytes) {
    failures.push(
      `initial gzip ${formatKilobytes(initialGzipBytes)} > ${formatKilobytes(budgets.initialGzipBytes)}`,
    );
  }
  if (largestJavaScript.bytes > budgets.largestJavaScriptBytes) {
    failures.push(
      `${largestJavaScript.name} ${formatKilobytes(largestJavaScript.bytes)} > ${formatKilobytes(budgets.largestJavaScriptBytes)}`,
    );
  }
  if (logoBytes > budgets.logoBytes) {
    failures.push(`logo ${formatKilobytes(logoBytes)} > ${formatKilobytes(budgets.logoBytes)}`);
  }
  if (lazyPageChunks < budgets.minimumLazyPageChunks) {
    failures.push(`only ${lazyPageChunks} lazy page chunks were emitted`);
  }

  console.log("Performance budget report");
  console.log(`- Entry: ${entryName} (${formatKilobytes(entryBytes)})`);
  console.log(
    `- Initial JavaScript: ${uniqueInitialJavaScript.length} files (${formatKilobytes(initialGzipBytes)} gzip)`,
  );
  console.log(
    `- Largest JavaScript: ${basename(largestJavaScript.name)} (${formatKilobytes(largestJavaScript.bytes)})`,
  );
  console.log(`- Logo: ${logoName} (${formatKilobytes(logoBytes)})`);
  console.log(`- Lazy page chunks: ${lazyPageChunks}`);

  if (failures.length > 0) {
    throw new Error(`Performance budget exceeded:\n- ${failures.join("\n- ")}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
