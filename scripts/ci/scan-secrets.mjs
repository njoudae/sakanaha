#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const patterns = [
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9_]{30,}/],
  ["Stripe key", /sk_(?:live|test)_[A-Za-z0-9]{16,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
];

async function main() {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter(Boolean);
  const findings = [];
  for (const file of files) {
    let contents;
    try {
      contents = await readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const [label, pattern] of patterns) {
      if (pattern.test(contents)) findings.push(`${file}: possible ${label}`);
    }
    if (/VITE_[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|AUTH_TOKEN)\s*=/.test(contents)) {
      findings.push(`${file}: secret-like variable uses the browser-visible VITE_ prefix`);
    }
  }
  if (findings.length) throw new Error(findings.join("\n"));
  console.log(`Secret scan passed (${files.length} non-ignored repository files checked).`);
}

main().catch((error) => {
  console.error(`Secret scan failed:\n${error.message}`);
  process.exitCode = 1;
});
