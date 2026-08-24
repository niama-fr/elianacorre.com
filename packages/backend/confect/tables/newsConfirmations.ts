import { Table } from "@confect/server";
import { sNewsConfirmationFields } from "@ec/domain/schemas/news-confirmations";

export default Table.make(() => sNewsConfirmationFields).index("by_subscription_id", ["subscriptionId"]);
