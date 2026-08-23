import { Table } from "@confect/server";
import { sNewsSuppressionFields } from "@ec/domain/schemas/news-suppressions";

export default Table.make(() => sNewsSuppressionFields).index("by_canonical_email_hash", ["canonicalEmailHash"]);
