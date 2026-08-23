import { Table } from "@confect/server";
import { sTravelPackFields } from "@ec/domain/schemas/travel-packs";

export default Table.make(() => sTravelPackFields)
  .index("by_cover_storage_id", ["coverStorageId"])
  .index("by_pdf_storage_id", ["pdfStorageId"])
  .index("by_slug", ["slug"])
  .index("by_updated_at", ["updatedAt"]);
