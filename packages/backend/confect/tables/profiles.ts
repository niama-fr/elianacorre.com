import { Table } from "@confect/server";
import { sProfileFields } from "@ec/domain/schemas/profiles";

export default Table.make(() => sProfileFields)
  .index("by_email", ["email"])
  .index("by_role", ["role"]);
