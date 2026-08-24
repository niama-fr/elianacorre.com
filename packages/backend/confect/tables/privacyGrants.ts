import { Table } from "@confect/server";
import { sPrivacyGrantFields } from "@ec/domain/schemas/privacy-grants";

export default Table.make(() => sPrivacyGrantFields).index("by_subject_hash_and_request_kind", ["subjectHash", "requestKind"]);
