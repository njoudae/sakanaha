import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import {
  assertConfirmation,
  compareInventories,
  createManifest,
  inspectConvexArchive,
  loadAndValidateManifest,
  parseArgs,
} from "./lib.mjs";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "saknaha-backup-test-"));
  const archivePath = join(directory, "snapshot.zip");
  const archive = zipSync({
    "users/documents.jsonl": strToU8('{"_id":"u1","name":"A"}\n'),
    "properties/documents.jsonl": strToU8('{"_id":"p1"}\n{"_id":"p2"}\n'),
    "_storage/documents.jsonl": strToU8('{"_id":"s1","sha256":"abc"}\n'),
    "_storage/s1": strToU8("file"),
  });
  await writeFile(archivePath, archive);
  return { directory, archivePath };
}

describe("backup argument and confirmation controls", () => {
  it("parses values and flags", () => {
    expect(parseArgs(["--deployment", "prod", "--execute", "snapshot.zip"])).toEqual({
      _: ["snapshot.zip"],
      deployment: "prod",
      execute: true,
    });
  });

  it("requires an exact confirmation phrase", () => {
    expect(() => assertConfirmation("RESTORE-production:x", "RESTORE-PRODUCTION:x")).toThrow();
    expect(() => assertConfirmation("RESTORE-PRODUCTION:x", "RESTORE-PRODUCTION:x")).not.toThrow();
  });
});

describe("Convex backup validation", () => {
  it("streams and inventories snapshot tables and storage", async () => {
    const { archivePath } = await fixture();
    const inventory = await inspectConvexArchive(archivePath);
    expect(inventory.tables.properties.documents).toBe(2);
    expect(inventory.storage).toMatchObject({
      included: true,
      metadataDocuments: 1,
      fileEntries: 1,
    });
  });

  it("detects archive tampering after a manifest is written", async () => {
    const { directory, archivePath } = await fixture();
    const inventory = await inspectConvexArchive(archivePath);
    const manifest = await createManifest({
      archivePath,
      deployment: "dev",
      environment: "development",
      inventory,
      createdAt: new Date(0).toISOString(),
    });
    const manifestPath = join(directory, "snapshot.manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest));
    await expect(loadAndValidateManifest(manifestPath)).resolves.toMatchObject({ inventory });
    const bytes = await readFile(archivePath);
    bytes[10] ^= 1;
    await writeFile(archivePath, bytes);
    await expect(loadAndValidateManifest(manifestPath)).rejects.toThrow("SHA-256");
  });

  it("reports restore inventory differences", async () => {
    const { archivePath } = await fixture();
    const source = await inspectConvexArchive(archivePath);
    const changed = structuredClone(source);
    changed.tables.properties.documents += 1;
    expect(compareInventories(source, changed)).toEqual([
      "properties: document count or content hash differs",
    ]);
  });
});
