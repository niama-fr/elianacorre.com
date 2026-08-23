import { CronJob, CronJobs } from "@confect/server";
import { Cron } from "effect";

import refs from "./_generated/refs";

export default CronJobs.make()
  .add(CronJob.make("enforce privacy retention", Cron.parseUnsafe("0 2 * * *"), refs.internal.retention.startRun))
  .add(
    CronJob.make("purge orphan storage", Cron.parseUnsafe("0 3 * * *"), refs.internal.storage.purgeOrphans, { before: null, cursor: null })
  );
