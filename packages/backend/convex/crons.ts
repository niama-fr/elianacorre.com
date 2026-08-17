import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("enforce privacy retention", { hourUTC: 2, minuteUTC: 0 }, internal.retention.startRun);

crons.daily("purge orphan storage", { hourUTC: 3, minuteUTC: 0 }, internal.storage.purgeOrphans, { before: null, cursor: null });

export default crons;
