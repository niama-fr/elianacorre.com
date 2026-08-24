import { Table } from "@confect/server";
import { sNewsSubscriptionFields } from "@ec/domain/schemas/news-subscriptions";

export default Table.make(() => sNewsSubscriptionFields)
  .index("by_profile_id_and_unsubscribed_at", ["profileId", "unsubscribedAt"])
  .index("by_profile_id_and_confirmed_at", ["profileId", "confirmedAt"]);
