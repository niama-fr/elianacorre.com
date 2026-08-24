import { Table } from "@confect/server";
import { sLegalTextFields } from "@ec/domain/schemas/legal-texts";

export default Table.make(() => sLegalTextFields).index("by_kind_and_published_at", ["kind", "publishedAt"]);
