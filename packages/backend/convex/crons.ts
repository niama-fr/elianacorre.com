import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("enforce newsletter retention", { hourUTC: 2, minuteUTC: 0 }, internal.retention.startRun);

export default crons;
