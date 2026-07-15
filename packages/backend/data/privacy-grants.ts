import { env, type MutationCtx, type QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";
import type { PrivacyGrants } from "@ec/domain/schemas/privacy-grants";
import { ConvexError } from "convex/values";

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listActivePrivacyGrants = async (ctx: QueryCtx, email: string) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  const grants = await ctx.db
    .query("privacyGrants")
    .withIndex("by_subject_hash_and_request_kind", (q) => q.eq("subjectHash", subjectHash))
    .collect();
  const now = Date.now();
  return grants.filter(({ expiresAt }) => expiresAt > now);
};

// REPLACE ---------------------------------------------------------------------------------------------------------------------------------
export const replacePrivacyGrant = async (ctx: MutationCtx, { email, ...create }: PrivacyGrants["Create"]) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  await deleteBySubjectAndKind(ctx, subjectHash, create.requestKind);
  return await ctx.db.insert("privacyGrants", { ...create, subjectHash });
};

// REVOKE ----------------------------------------------------------------------------------------------------------------------------------
export const revokePrivacyGrant = async (ctx: MutationCtx, email: string, requestKind: PrivacyAudits["RequestKind"]) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  await deleteBySubjectAndKind(ctx, subjectHash, requestKind);
};

// CONSUME ---------------------------------------------------------------------------------------------------------------------------------
export const consumePrivacyGrant = async (ctx: MutationCtx, email: string, requestKind: PrivacyAudits["RequestKind"]) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  const grant = await ctx.db
    .query("privacyGrants")
    .withIndex("by_subject_hash_and_request_kind", (query) => query.eq("subjectHash", subjectHash).eq("requestKind", requestKind))
    .unique();
  if (!grant || grant.expiresAt <= Date.now()) {
    if (grant) await ctx.db.delete("privacyGrants", grant._id);
    throw new ConvexError("PRIVACY_GRANT_REQUIRED");
  }
  await ctx.db.delete("privacyGrants", grant._id);
  return grant.verificationAuditId;
};

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deletePrivacyGrant = async (ctx: MutationCtx, id: Id<"privacyGrants">) => {
  const grant = await ctx.db.get("privacyGrants", id);
  if (grant) await ctx.db.delete("privacyGrants", id);
};

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
async function deleteBySubjectAndKind(ctx: MutationCtx, subjectHash: string, requestKind: PrivacyAudits["RequestKind"]) {
  const grants = await ctx.db
    .query("privacyGrants")
    .withIndex("by_subject_hash_and_request_kind", (query) => query.eq("subjectHash", subjectHash).eq("requestKind", requestKind))
    .collect();
  for (const grant of grants) await ctx.db.delete("privacyGrants", grant._id);
}
