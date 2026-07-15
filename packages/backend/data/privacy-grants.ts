import { env, type MutationCtx, type QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";
import type { PrivacyGrants } from "@ec/domain/schemas/privacy-grants";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getPrivacyGrant = async (ctx: QueryCtx, { email, requestKind }: GrantRef) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return await ctx.db
    .query("privacyGrants")
    .withIndex("by_subject_hash_and_request_kind", (q) => q.eq("subjectHash", subjectHash).eq("requestKind", requestKind))
    .unique();
};

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listActivePrivacyGrants = async (ctx: QueryCtx, { email, now }: WithNow<{ email: string }>) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  const grants = await ctx.db
    .query("privacyGrants")
    .withIndex("by_subject_hash_and_request_kind", (q) => q.eq("subjectHash", subjectHash))
    .collect();
  return grants.filter(({ expiresAt }) => expiresAt > now);
};

export const listPrivacyGrantsByRequestKind = async (ctx: QueryCtx, { email, requestKind }: GrantRef) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return await ctx.db
    .query("privacyGrants")
    .withIndex("by_subject_hash_and_request_kind", (q) => q.eq("subjectHash", subjectHash).eq("requestKind", requestKind))
    .collect();
};

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deletePrivacyGrant = async (ctx: MutationCtx, id: Id<"privacyGrants">) => {
  await ctx.db.delete("privacyGrants", id);
};

// REVOKE ----------------------------------------------------------------------------------------------------------------------------------
export const revokePrivacyGrant = async (ctx: MutationCtx, { email, requestKind }: GrantRef) => {
  const grants = await listPrivacyGrantsByRequestKind(ctx, { email, requestKind });
  for (const grant of grants) await deletePrivacyGrant(ctx, grant._id);
};

// REPLACE ---------------------------------------------------------------------------------------------------------------------------------
export const replacePrivacyGrant = async (ctx: MutationCtx, { email, ...create }: PrivacyGrants["Create"]) => {
  const subjectHash = await hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  await revokePrivacyGrant(ctx, { email, requestKind: create.requestKind });
  return await ctx.db.insert("privacyGrants", { ...create, subjectHash });
};

// CONSUME ---------------------------------------------------------------------------------------------------------------------------------
export const consumePrivacyGrant = async (ctx: MutationCtx, { email, now, requestKind }: WithNow<GrantRef>) => {
  const grant = await getPrivacyGrant(ctx, { email, requestKind });
  if (!grant || grant.expiresAt <= now) throw new ConvexError("PRIVACY_GRANT_REQUIRED");
  await deletePrivacyGrant(ctx, grant._id);
  return grant.verificationAuditId;
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type GrantRef = { email: string; requestKind: PrivacyAudits["RequestKind"] };
