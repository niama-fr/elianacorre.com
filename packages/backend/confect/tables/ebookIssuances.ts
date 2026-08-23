import { Table } from "@confect/server";
import { sEbookIssuanceFields } from "@ec/domain/schemas/ebook-issuances";

export default Table.make(() => sEbookIssuanceFields).index("by_profile_id", ["profileId"]);
