import { Table } from "@confect/server";
import { sContactRequestFields } from "@ec/domain/schemas/contact-requests";

export default Table.make(() => sContactRequestFields).index("by_profile_id", ["profileId"]);
