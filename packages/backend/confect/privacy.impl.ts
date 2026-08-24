import { FunctionImpl, GroupImpl } from "@confect/server";
import { start } from "@convex-dev/workflow";
import type { Id } from "@ec/backend/types";
import { anyApi, type FunctionReference } from "convex/server";
import { Effect as E, Layer as L } from "effect";

import { deletePrivacyGrant } from "../data/privacy-grants";
import {
  completePrivacyErasure,
  erasePrivacySubjectBatch,
  inspectPrivacySubject,
  processPrivacyAccess,
  processPrivacyErasure,
  processPrivacyExport,
  processPrivacyObjection,
  processPrivacyRectification,
  processPrivacySuppressionRemoval,
  processPrivacyUnsubscription,
  processPrivacyVerification,
} from "../features/privacy";
import { currentAdminLayer } from "../infra/current-profile";
import databaseSchema from "./_generated/schema";
import { MutationCtx, QueryCtx } from "./_generated/services";
import { erasureWorkflow } from "./privacy-erasure";
import spec from "./privacy.spec";

const erasureWorkflowImpl = FunctionImpl.make(databaseSchema, spec, "erasureWorkflow", erasureWorkflow);
type ErasureWorkflowArgs = {
  email: string;
  privacyAuditId: Id<"privacyAudits">;
  profileId: Id<"profiles">;
};
// A same-module generated ref creates a recursive inferred type. The explicit annotation keeps this internal boundary typed.
const erasureWorkflowRef: FunctionReference<"mutation", "internal", ErasureWorkflowArgs, void> = anyApi.privacy.erasureWorkflow;

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const inspectSubject = FunctionImpl.make(databaseSchema, spec, "inspectSubject", ({ email }) =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* inspectPrivacySubject(email).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const fulfillAccessRequest = FunctionImpl.make(databaseSchema, spec, "fulfillAccessRequest", ({ email }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* processPrivacyAccess(email).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const fulfillErasureRequest = FunctionImpl.make(databaseSchema, spec, "fulfillErasureRequest", ({ email }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    const result = yield* processPrivacyErasure(email).pipe(E.provide(currentAdminLayer(ctx)));
    if ("erasure" in result) yield* E.promise(async () => await start(ctx, erasureWorkflowRef, result.erasure));
    return { outcome: result.outcome };
  })
);

const fulfillExportRequest = FunctionImpl.make(databaseSchema, spec, "fulfillExportRequest", ({ email }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* processPrivacyExport(email).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const fulfillObjectionRequest = FunctionImpl.make(databaseSchema, spec, "fulfillObjectionRequest", ({ email }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* processPrivacyObjection(email).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const fulfillRectificationRequest = FunctionImpl.make(databaseSchema, spec, "fulfillRectificationRequest", ({ email, firstName }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* processPrivacyRectification({ email, firstName }).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const fulfillSuppressionRemovalRequest = FunctionImpl.make(databaseSchema, spec, "fulfillSuppressionRemovalRequest", ({ email }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* processPrivacySuppressionRemoval(email).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const fulfillUnsubscriptionRequest = FunctionImpl.make(databaseSchema, spec, "fulfillUnsubscriptionRequest", ({ email }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* processPrivacyUnsubscription(email).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const recordVerification = FunctionImpl.make(databaseSchema, spec, "recordVerification", (payload) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* processPrivacyVerification(payload).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const expireGrant = FunctionImpl.make(databaseSchema, spec, "expireGrant", ({ privacyGrantId }) =>
  E.gen(function* () {
    yield* deletePrivacyGrant(privacyGrantId);
    return null;
  })
);

const eraseBatch = FunctionImpl.make(databaseSchema, spec, "eraseBatch", (args) => erasePrivacySubjectBatch(args));

const completeErasure = FunctionImpl.make(databaseSchema, spec, "completeErasure", (args) => completePrivacyErasure(args));

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(erasureWorkflowImpl),
  L.provide(inspectSubject),
  L.provide(fulfillAccessRequest),
  L.provide(fulfillErasureRequest),
  L.provide(fulfillExportRequest),
  L.provide(fulfillObjectionRequest),
  L.provide(fulfillRectificationRequest),
  L.provide(fulfillSuppressionRemovalRequest),
  L.provide(fulfillUnsubscriptionRequest),
  L.provide(recordVerification),
  L.provide(eraseBatch),
  L.provide(completeErasure),
  L.provide(expireGrant),
  GroupImpl.finalize
);
