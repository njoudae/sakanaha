import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const seedManifest = v.object({
  version: v.number(),
  source: v.string(),
  requestedAt: v.number(),
  records: v.array(
    v.object({
      table: v.string(),
      idempotencyKey: v.string(),
      value: v.any(),
    }),
  ),
});

export const validateSeedManifest = internalMutation({
  args: {
    manifest: seedManifest,
  },
  returns: v.object({
    version: v.number(),
    source: v.string(),
    totalRecords: v.number(),
    tables: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    const tables = Array.from(new Set(args.manifest.records.map((record) => record.table))).sort();

    return {
      version: args.manifest.version,
      source: args.manifest.source,
      totalRecords: args.manifest.records.length,
      tables,
    };
  },
});
