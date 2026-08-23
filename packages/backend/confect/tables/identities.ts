import { Table } from "@confect/server";
import { sIdentityFields } from "@ec/domain/schemas/identities";

export default Table.make(() => sIdentityFields)
  .index("by_profile_id_and_adapter", ["profileId", "adapter"])
  .index("by_adapter_and_adapter_id", ["adapter", "adapterId"]);
