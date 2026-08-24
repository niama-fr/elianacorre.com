import { Table } from "@confect/server";
import { sEbookDownloadFields } from "@ec/domain/schemas/ebook-downloads";

export default Table.make(() => sEbookDownloadFields).index("by_ebook_issuance_id", ["ebookIssuanceId"]);
