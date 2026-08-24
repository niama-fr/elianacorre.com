import { Table } from "@confect/server";
import { sLoopsTaskFields } from "@ec/domain/schemas/loops-tasks";

export default Table.make(() => sLoopsTaskFields)
  .index("by_ebook_download_id", ["ebookDownloadId"])
  .index("by_finished_at", ["finishedAt"])
  .index("by_idempotency_key", ["idempotencyKey"])
  .index("by_profile_id", ["profileId"])
  .index("by_status_and_finished_at", ["status", "finishedAt"]);
