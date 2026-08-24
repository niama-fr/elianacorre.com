import { Table } from "@confect/server";
import { sEbookFields } from "@ec/domain/schemas/ebooks";

export default Table.make(() => sEbookFields)
  .index("by_status", ["status"])
  .index("by_storage_id", ["storageId"])
  .index("by_version", ["version"]);
