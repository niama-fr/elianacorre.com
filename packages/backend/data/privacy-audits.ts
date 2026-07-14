import { env, type QueryCtx } from "@ec/backend/server";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";

// TRANSFORMS ------------------------------------------------------------------------------------------------------------------------------
export const privacyAuditFromDoc = ({ subjectHash: _, ...entry }: PrivacyAudits["Doc"]): PrivacyAudits["Entry"] => entry;

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listPrivacyAuditsByEmail = async (ctx: QueryCtx, email: string) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  const docs = await ctx.db
    .query("privacyAudits")
    .withIndex("by_subject_hash", (q) => q.eq("subjectHash", subjectHash))
    .order("desc")
    .collect();
  return docs.map(privacyAuditFromDoc);
};
