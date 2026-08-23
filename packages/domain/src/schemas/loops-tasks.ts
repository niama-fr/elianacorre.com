import { GenericId, SystemFields } from "@confect/core";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";
import { z } from "zod";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const kinds = ["deleteContact", "sendConfirmationEmail", "sendEbookEmail", "syncContact"] as const;

const statuses = ["failed", "pending", "succeeded"] as const;

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const sLoopsTaskKind = S.Literals(kinds);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const sLoopsTaskStatus = S.Literals(statuses);

// FAILURE ---------------------------------------------------------------------------------------------------------------------------------
export const loopsTaskRetryableFailures = ["network", "rateLimited", "server"] as const;

export const loopsTaskFailures = [...loopsTaskRetryableFailures, "authentication", "missingResource", "unknown", "validation"] as const;

export const sLoopsTaskRetryableFailure = S.Literals(loopsTaskRetryableFailures);

export const sLoopsTaskFailure = S.Literals(loopsTaskFailures);

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sEbookDownloadId = GenericId.GenericId("ebookDownloads");
const sNewsConfirmationId = GenericId.GenericId("newsConfirmations");
const sProfileId = GenericId.GenericId("profiles");

const sWorkflowIds = S.Array(S.String);
const sTerminalWorkflowIds = sWorkflowIds.check(S.isMinLength(1));

// STATE FIELDS ----------------------------------------------------------------------------------------------------------------------------
const commonFields = {
  idempotencyKey: S.String,
  replayCount: S.Finite,
};

const pendingFields = {
  acknowledgedAt: S.Null,
  failure: S.Null,
  finishedAt: S.Null,
  status: S.Literal("pending"),
  workflowIds: sWorkflowIds,
};

const failedFields = {
  acknowledgedAt: S.NullOr(S.Finite),
  failure: sLoopsTaskFailure,
  finishedAt: S.Finite,
  status: S.Literal("failed"),
  workflowIds: sTerminalWorkflowIds,
};

const succeededFields = {
  acknowledgedAt: S.Null,
  failure: S.Null,
  finishedAt: S.Finite,
  status: S.Literal("succeeded"),
  workflowIds: sTerminalWorkflowIds,
};

const sFailedFields = S.Struct(failedFields);
const sSucceededFields = S.Struct(succeededFields);

// PENDING ---------------------------------------------------------------------------------------------------------------------------------
const pendingDeleteContactFields = {
  ...commonFields,
  ...pendingFields,
  email: sCanonicalEmail,
  kind: S.Literal("deleteContact"),
};

const pendingSendConfirmationEmailFields = {
  ...commonFields,
  ...pendingFields,
  kind: S.Literal("sendConfirmationEmail"),
  newsConfirmationId: sNewsConfirmationId,
  profileId: sProfileId,
};

const pendingSendEbookEmailFields = {
  ...commonFields,
  ...pendingFields,
  ebookDownloadId: sEbookDownloadId,
  kind: S.Literal("sendEbookEmail"),
  profileId: sProfileId,
};

const pendingSyncContactFields = {
  ...commonFields,
  ...pendingFields,
  kind: S.Literal("syncContact"),
  profileId: sProfileId,
  subscribed: S.Boolean,
};

// FAILED ----------------------------------------------------------------------------------------------------------------------------------
const failedDeleteContactFields = {
  ...commonFields,
  ...failedFields,
  email: sCanonicalEmail,
  kind: S.Literal("deleteContact"),
};

const failedSendConfirmationEmailFields = {
  ...commonFields,
  ...failedFields,
  kind: S.Literal("sendConfirmationEmail"),
  newsConfirmationId: sNewsConfirmationId,
  profileId: sProfileId,
};

const failedSendEbookEmailFields = {
  ...commonFields,
  ...failedFields,
  ebookDownloadId: sEbookDownloadId,
  kind: S.Literal("sendEbookEmail"),
  profileId: sProfileId,
};

const failedSyncContactFields = {
  ...commonFields,
  ...failedFields,
  kind: S.Literal("syncContact"),
  profileId: sProfileId,
  subscribed: S.Boolean,
};

// SUCCEEDED -------------------------------------------------------------------------------------------------------------------------------
const succeededDeleteContactFields = {
  ...commonFields,
  ...succeededFields,
  email: S.Null,
  kind: S.Literal("deleteContact"),
};

const succeededSendConfirmationEmailFields = {
  ...commonFields,
  ...succeededFields,
  kind: S.Literal("sendConfirmationEmail"),
  newsConfirmationId: sNewsConfirmationId,
  profileId: sProfileId,
};

const succeededSendEbookEmailFields = {
  ...commonFields,
  ...succeededFields,
  ebookDownloadId: sEbookDownloadId,
  kind: S.Literal("sendEbookEmail"),
  profileId: sProfileId,
};

const succeededSyncContactFields = {
  ...commonFields,
  ...succeededFields,
  kind: S.Literal("syncContact"),
  profileId: sProfileId,
  subscribed: S.Boolean,
};

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sLoopsTaskFields = S.Union([
  S.Struct(pendingDeleteContactFields),
  S.Struct(pendingSendConfirmationEmailFields),
  S.Struct(pendingSendEbookEmailFields),
  S.Struct(pendingSyncContactFields),

  S.Struct(failedDeleteContactFields),
  S.Struct(failedSendConfirmationEmailFields),
  S.Struct(failedSendEbookEmailFields),
  S.Struct(failedSyncContactFields),

  S.Struct(succeededDeleteContactFields),
  S.Struct(succeededSendConfirmationEmailFields),
  S.Struct(succeededSendEbookEmailFields),
  S.Struct(succeededSyncContactFields),
]);

// DOC -------------------------------------------------------------------------------------------------------------------------------------
const systemFields = SystemFields.SystemFields("loopsTasks").fields;

export const sLoopsTaskDoc = S.Union([
  S.Struct({ ...systemFields, ...pendingDeleteContactFields }),
  S.Struct({ ...systemFields, ...pendingSendConfirmationEmailFields }),
  S.Struct({ ...systemFields, ...pendingSendEbookEmailFields }),
  S.Struct({ ...systemFields, ...pendingSyncContactFields }),

  S.Struct({ ...systemFields, ...failedDeleteContactFields }),
  S.Struct({ ...systemFields, ...failedSendConfirmationEmailFields }),
  S.Struct({ ...systemFields, ...failedSendEbookEmailFields }),
  S.Struct({ ...systemFields, ...failedSyncContactFields }),

  S.Struct({ ...systemFields, ...succeededDeleteContactFields }),
  S.Struct({ ...systemFields, ...succeededSendConfirmationEmailFields }),
  S.Struct({ ...systemFields, ...succeededSendEbookEmailFields }),
  S.Struct({ ...systemFields, ...succeededSyncContactFields }),
]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const sDeleteContactCreate = S.Struct({
  email: sCanonicalEmail,
  idempotencyKey: S.String,
  kind: S.Literal("deleteContact"),
});

const sSendConfirmationEmailCreate = S.Struct({
  idempotencyKey: S.String,
  kind: S.Literal("sendConfirmationEmail"),
  newsConfirmationId: sNewsConfirmationId,
  profileId: sProfileId,
});

const sSendEbookEmailCreate = S.Struct({
  ebookDownloadId: sEbookDownloadId,
  idempotencyKey: S.String,
  kind: S.Literal("sendEbookEmail"),
  profileId: sProfileId,
});

const sSyncContactCreate = S.Struct({
  idempotencyKey: S.String,
  kind: S.Literal("syncContact"),
  profileId: sProfileId,
  subscribed: S.Boolean,
});

export const sLoopsTaskCreate = S.Union([sDeleteContactCreate, sSendConfirmationEmailCreate, sSendEbookEmailCreate, sSyncContactCreate]);

// LEGACY ----------------------------------------------------------------------------------------------------------------------------------
// Temporary while convex/loops.ts and classifyLoopsTaskFailure still use Zod.
export const zLoopsTaskFailure = z.literal(loopsTaskFailures);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type LoopsTaskDoc = typeof sLoopsTaskDoc.Type;

export type LoopsTasks = {
  DeleteContactCreate: typeof sDeleteContactCreate.Type;
  DeleteContactDoc: Extract<LoopsTaskDoc, { readonly kind: "deleteContact" }>;
  SyncContactCreate: typeof sSyncContactCreate.Type;
  SyncContactDoc: Extract<LoopsTaskDoc, { readonly kind: "syncContact" }>;
  Create: typeof sLoopsTaskCreate.Type;
  Doc: LoopsTaskDoc;
  FailedDoc: Extract<LoopsTaskDoc, { readonly status: "failed" }>;
  FailedFields: typeof sFailedFields.Type;
  Failure: typeof sLoopsTaskFailure.Type;
  Fields: typeof sLoopsTaskFields.Type;
  Kind: typeof sLoopsTaskKind.Type;
  PendingDoc: Extract<LoopsTaskDoc, { readonly status: "pending" }>;
  SendConfirmationEmailCreate: typeof sSendConfirmationEmailCreate.Type;
  SendConfirmationEmailDoc: Extract<LoopsTaskDoc, { readonly kind: "sendConfirmationEmail" }>;
  SendEbookEmailCreate: typeof sSendEbookEmailCreate.Type;
  SendEbookEmailDoc: Extract<LoopsTaskDoc, { readonly kind: "sendEbookEmail" }>;
  Status: typeof sLoopsTaskStatus.Type;
  SucceededFields: typeof sSucceededFields.Type;
};
