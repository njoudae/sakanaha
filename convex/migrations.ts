import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const localStorageKey = v.union(
  v.literal("saknaha.owners"),
  v.literal("saknaha.currentOwner"),
  v.literal("saknaha.users"),
  v.literal("saknaha.currentUser"),
  v.literal("saknaha.properties"),
  v.literal("saknaha.interests"),
  v.literal("saknaha.favorites"),
  v.literal("saknaha.roommates"),
  v.literal("saknaha.roommateRequests"),
  v.literal("saknaha.negotiations"),
);

const localStorageExportEnvelope = v.object({
  schemaVersion: v.number(),
  source: v.literal("saknaha-web-localStorage"),
  exportedAt: v.number(),
  sourceChecksum: v.string(),
  dryRun: v.boolean(),
  records: v.array(
    v.object({
      sourceKey: localStorageKey,
      legacyId: v.optional(v.string()),
      checksum: v.optional(v.string()),
      value: v.any(),
    }),
  ),
});

const importSummary = v.object({
  schemaVersion: v.number(),
  source: v.string(),
  sourceChecksum: v.string(),
  dryRun: v.boolean(),
  totalRecords: v.number(),
  owners: v.number(),
  users: v.number(),
  properties: v.number(),
  interests: v.number(),
  favorites: v.number(),
  roommatePreferences: v.number(),
  roommateRequests: v.number(),
  negotiationSignals: v.number(),
  sessionPointers: v.number(),
});

function summarizeEnvelope(envelope: {
  schemaVersion: number;
  source: string;
  sourceChecksum: string;
  dryRun: boolean;
  records: Array<{ sourceKey: string }>;
}) {
  const count = (key: string) =>
    envelope.records.filter((record) => record.sourceKey === key).length;

  return {
    schemaVersion: envelope.schemaVersion,
    source: envelope.source,
    sourceChecksum: envelope.sourceChecksum,
    dryRun: envelope.dryRun,
    totalRecords: envelope.records.length,
    owners: count("saknaha.owners"),
    users: count("saknaha.users"),
    properties: count("saknaha.properties"),
    interests: count("saknaha.interests"),
    favorites: count("saknaha.favorites"),
    roommatePreferences: count("saknaha.roommates"),
    roommateRequests: count("saknaha.roommateRequests"),
    negotiationSignals: count("saknaha.negotiations"),
    sessionPointers: count("saknaha.currentOwner") + count("saknaha.currentUser"),
  };
}

export const summarizeLocalStorageExport = query({
  args: {
    envelope: localStorageExportEnvelope,
  },
  returns: importSummary,
  handler: async (_ctx, args) => summarizeEnvelope(args.envelope),
});

export const dryRunLocalStorageImport = internalMutation({
  args: {
    envelope: localStorageExportEnvelope,
  },
  returns: importSummary,
  handler: async (_ctx, args) => summarizeEnvelope(args.envelope),
});
