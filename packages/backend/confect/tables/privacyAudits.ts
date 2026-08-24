import { Table } from "@confect/server";
import { sPrivacyAuditFields } from "@ec/domain/schemas/privacy-audits";

export default Table.make(() => sPrivacyAuditFields)
  .index("by_subject_hash", ["subjectHash"])
  .index("by_subject_hash_kind_outcome", ["subjectHash", "kind", "outcome"]);
