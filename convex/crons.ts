import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "clean orphaned property media",
  { hours: 1 },
  internal.mediaCleanup.cleanupOrphans,
  {},
);

crons.interval(
  "deliver queued notifications",
  { minutes: 1 },
  internal.notificationDelivery.processDue,
  {},
);

export default crons;
