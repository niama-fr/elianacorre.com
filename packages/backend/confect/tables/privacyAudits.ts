import { Table } from "@confect/server";
import { sPrivacyAuditFields } from "@ec/domain/schemas/privacy-audits";

export default Table.make(() => sPrivacyAuditFields).index("by_subject_hash", ["subjectHash"]);
