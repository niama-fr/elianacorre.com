import { Table } from "@confect/server";
import { sNewsRestrictionFields } from "@ec/domain/schemas/news-restrictions";

export default Table.make(() => sNewsRestrictionFields)
  .index("by_profile_id_and_resolved_at", ["profileId", "resolvedAt"])
  .index("by_profile_id_and_restricted_at", ["profileId", "restrictedAt"]);
