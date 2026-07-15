import { env, type MutationCtx, type QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";
import type { PrivacyAuthorizations } from "@ec/domain/schemas/privacy-authorizations";
import { ConvexError } from "convex/values";

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listActivePrivacyAuthorizations = async (ctx: QueryCtx, email: string) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  const authorizations = await ctx.db
    .query("privacyAuthorizations")
    .withIndex("by_subject_hash_and_request_kind", (query) => query.eq("subjectHash", subjectHash))
    .collect();
  const now = Date.now();
  return authorizations.filter(({ expiresAt }) => expiresAt > now);
};

// REPLACE ---------------------------------------------------------------------------------------------------------------------------------
export const replacePrivacyAuthorization = async (ctx: MutationCtx, { email, ...create }: PrivacyAuthorizations["Create"]) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  await deleteBySubjectAndKind(ctx, subjectHash, create.requestKind);
  return await ctx.db.insert("privacyAuthorizations", { ...create, subjectHash });
};

// REVOKE ----------------------------------------------------------------------------------------------------------------------------------
export const revokePrivacyAuthorization = async (ctx: MutationCtx, email: string, requestKind: PrivacyAudits["RequestKind"]) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  await deleteBySubjectAndKind(ctx, subjectHash, requestKind);
};

// CONSUME ---------------------------------------------------------------------------------------------------------------------------------
export const consumePrivacyAuthorization = async (ctx: MutationCtx, email: string, requestKind: PrivacyAudits["RequestKind"]) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  const authorization = await ctx.db
    .query("privacyAuthorizations")
    .withIndex("by_subject_hash_and_request_kind", (query) => query.eq("subjectHash", subjectHash).eq("requestKind", requestKind))
    .unique();
  if (!authorization || authorization.expiresAt <= Date.now()) {
    if (authorization) await ctx.db.delete("privacyAuthorizations", authorization._id);
    throw new ConvexError("PRIVACY_VERIFICATION_REQUIRED");
  }
  await ctx.db.delete("privacyAuthorizations", authorization._id);
  return authorization.verificationAuditId;
};

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deletePrivacyAuthorization = async (ctx: MutationCtx, id: Id<"privacyAuthorizations">) => {
  const authorization = await ctx.db.get("privacyAuthorizations", id);
  if (authorization) await ctx.db.delete("privacyAuthorizations", id);
};

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
async function deleteBySubjectAndKind(ctx: MutationCtx, subjectHash: string, requestKind: PrivacyAudits["RequestKind"]) {
  const authorizations = await ctx.db
    .query("privacyAuthorizations")
    .withIndex("by_subject_hash_and_request_kind", (query) => query.eq("subjectHash", subjectHash).eq("requestKind", requestKind))
    .collect();
  for (const authorization of authorizations) await ctx.db.delete("privacyAuthorizations", authorization._id);
}
