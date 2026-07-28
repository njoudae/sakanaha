import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import yauzl from "yauzl";

export const MANIFEST_VERSION = 1;
export const ENVIRONMENTS = new Set(["development", "staging", "production"]);
const BOOLEAN_ARGS = new Set(["execute", "help"]);

export function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      result._.push(value);
      continue;
    }
    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      result[rawKey] = inlineValue;
    } else if (BOOLEAN_ARGS.has(rawKey)) {
      result[rawKey] = true;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      result[rawKey] = argv[index + 1];
      index += 1;
    } else {
      result[rawKey] = true;
    }
  }
  return result;
}

export function requireString(args, key) {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required --${key} value.`);
  }
  return value.trim();
}

export function requireEnvironment(value) {
  if (!ENVIRONMENTS.has(value)) {
    throw new Error("--environment must be development, staging, or production.");
  }
  return value;
}

export function assertConfirmation(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Confirmation required. Re-run with --confirm "${expected}".`);
  }
}

export function safeArtifactName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "deployment";
}

export async function sha256File(filePath) {
  return await new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

function isUnsafeZipPath(fileName) {
  const normalized = fileName.replaceAll("\\", "/");
  return (
    isAbsolute(fileName) ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..") ||
    /^[a-zA-Z]:/.test(normalized)
  );
}

function openZip(filePath) {
  return new Promise((resolveZip, reject) => {
    yauzl.open(filePath, { lazyEntries: true, autoClose: false }, (error, zipFile) => {
      if (error) reject(error);
      else resolveZip(zipFile);
    });
  });
}

function openEntryStream(zipFile, entry) {
  return new Promise((resolveStream, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) reject(error);
      else resolveStream(stream);
    });
  });
}

async function inspectJsonLines(zipFile, entry) {
  const stream = await openEntryStream(zipFile, entry);
  const decoder = new StringDecoder("utf8");
  const hash = createHash("sha256");
  let pending = "";
  let documents = 0;

  const inspectLine = (line) => {
    const trimmed = line.trim();
    if (trimmed === "") return;
    try {
      JSON.parse(trimmed);
    } catch (error) {
      throw new Error(
        `${entry.fileName} contains invalid JSON on line ${documents + 1}: ${error.message}`,
        {
          cause: error,
        },
      );
    }
    documents += 1;
  };

  for await (const chunk of stream) {
    hash.update(chunk);
    pending += decoder.write(chunk);
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) inspectLine(line);
  }
  pending += decoder.end();
  inspectLine(pending);

  return {
    documents,
    sha256: hash.digest("hex"),
    bytes: entry.uncompressedSize,
  };
}

async function hashEntry(zipFile, entry) {
  const stream = await openEntryStream(zipFile, entry);
  const hash = createHash("sha256");
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

export async function inspectConvexArchive(filePath) {
  const archivePath = resolve(filePath);
  const fileStat = await stat(archivePath);
  if (!fileStat.isFile() || fileStat.size === 0)
    throw new Error("Backup archive is empty or missing.");

  const zipFile = await openZip(archivePath);
  const seen = new Set();
  const tables = {};
  let storageFiles = 0;
  let storageBytes = 0;
  const storageContent = [];
  let entries = 0;

  try {
    await new Promise((resolveEntries, reject) => {
      zipFile.on("error", reject);
      zipFile.on("end", resolveEntries);
      zipFile.on("entry", async (entry) => {
        try {
          entries += 1;
          if (isUnsafeZipPath(entry.fileName))
            throw new Error(`Unsafe ZIP path: ${entry.fileName}`);
          if (seen.has(entry.fileName)) throw new Error(`Duplicate ZIP entry: ${entry.fileName}`);
          seen.add(entry.fileName);

          const tableMatch = /^([^/]+)\/documents\.jsonl$/.exec(entry.fileName);
          if (tableMatch) {
            tables[tableMatch[1]] = await inspectJsonLines(zipFile, entry);
          } else if (entry.fileName.startsWith("_storage/") && !entry.fileName.endsWith("/")) {
            storageFiles += 1;
            storageBytes += entry.uncompressedSize;
            const entryHash = await hashEntry(zipFile, entry);
            storageContent.push(`${entry.fileName}\0${entry.uncompressedSize}\0${entryHash}\n`);
          }
          zipFile.readEntry();
        } catch (error) {
          reject(error);
        }
      });
      zipFile.readEntry();
    });
  } finally {
    zipFile.close();
  }

  const tableNames = Object.keys(tables).sort();
  if (tableNames.length === 0)
    throw new Error("Archive has no Convex <table>/documents.jsonl entries.");
  const storageMetadata = tables._storage;
  if (storageFiles > 0 && !storageMetadata) {
    throw new Error("Archive has storage file entries but no _storage/documents.jsonl metadata.");
  }
  if (storageMetadata && storageFiles !== storageMetadata.documents) {
    throw new Error("Stored-file count does not match _storage metadata document count.");
  }

  return {
    entries,
    tables: Object.fromEntries(tableNames.map((name) => [name, tables[name]])),
    storage: {
      included: Boolean(storageMetadata),
      metadataDocuments: storageMetadata?.documents ?? 0,
      fileEntries: storageFiles,
      fileBytes: storageBytes,
      contentSha256: createHash("sha256").update(storageContent.sort().join("")).digest("hex"),
    },
  };
}

export async function createManifest({
  archivePath,
  deployment,
  environment,
  inventory,
  createdAt,
}) {
  const fileStat = await stat(archivePath);
  return {
    manifestVersion: MANIFEST_VERSION,
    createdAt,
    deployment,
    environment,
    archive: {
      fileName: basename(archivePath),
      bytes: fileStat.size,
      sha256: await sha256File(archivePath),
    },
    inventory,
    includesFileStorage: inventory.storage.included,
  };
}

export async function loadAndValidateManifest(manifestPath, archiveOverride) {
  const absoluteManifest = resolve(manifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifest, "utf8"));
  if (manifest.manifestVersion !== MANIFEST_VERSION)
    throw new Error("Unsupported backup manifest version.");
  requireEnvironment(manifest.environment);
  if (typeof manifest.deployment !== "string" || typeof manifest.archive?.sha256 !== "string") {
    throw new Error("Backup manifest is incomplete.");
  }
  const archivePath = resolve(
    archiveOverride ?? dirname(absoluteManifest),
    archiveOverride ? "" : manifest.archive.fileName,
  );
  const resolvedArchive = archiveOverride ? resolve(archiveOverride) : archivePath;
  const archiveStat = await stat(resolvedArchive);
  if (archiveStat.size !== manifest.archive.bytes)
    throw new Error("Backup archive size does not match its manifest.");
  const actualHash = await sha256File(resolvedArchive);
  if (actualHash !== manifest.archive.sha256)
    throw new Error("Backup archive SHA-256 does not match its manifest.");
  const inventory = await inspectConvexArchive(resolvedArchive);
  if (JSON.stringify(inventory) !== JSON.stringify(manifest.inventory)) {
    throw new Error("Backup archive inventory does not match its manifest.");
  }
  return { manifest, archivePath: resolvedArchive, inventory };
}

export async function runCommand(command, args, options = {}) {
  await new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false, ...options });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} exited with ${code ?? signal}.`));
    });
  });
}

export function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

export function compareInventories(source, restored) {
  const differences = [];
  const names = new Set([...Object.keys(source.tables), ...Object.keys(restored.tables)]);
  for (const name of [...names].sort()) {
    const before = source.tables[name];
    const after = restored.tables[name];
    if (!before || !after) {
      differences.push(`${name}: table missing from ${before ? "restored" : "source"} backup`);
    } else if (before.documents !== after.documents || before.sha256 !== after.sha256) {
      differences.push(`${name}: document count or content hash differs`);
    }
  }
  if (source.storage.fileEntries !== restored.storage.fileEntries) {
    differences.push("_storage: stored file entry count differs");
  }
  if (source.storage.contentSha256 !== restored.storage.contentSha256) {
    differences.push("_storage: stored file content differs");
  }
  return differences;
}
