import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["deleteContact", "sendConfirmationEmail", "sendEbookEmail", "syncContact"] as const;
export const zLoopsTaskKind = z.literal(kinds);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
const statuses = ["failed", "pending", "succeeded"] as const;
export const zLoopsTaskStatus = z.literal(statuses);

// FAILURE ---------------------------------------------------------------------------------------------------------------------------------
export const loopsTaskRetryableFailures = ["network", "rateLimited", "server"] as const;
export const loopsTaskFailures = [...loopsTaskRetryableFailures, "authentication", "missingResource", "unknown", "validation"] as const;
export const zLoopsTaskRetryableFailure = z.literal(loopsTaskRetryableFailures);
export const zLoopsTaskFailure = z.literal(loopsTaskFailures);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonFields = z.object({
  idempotencyKey: z.string(),
  replayCount: z.number(),
});
const zPendingFields = z.object({
  acknowledgedAt: z.null(),
  failure: z.null(),
  finishedAt: z.null(),
  status: z.literal("pending"),
  workflowIds: z.array(z.string()),
});
const zFailedFields = z.object({
  acknowledgedAt: z.number().nullable(),
  failure: zLoopsTaskFailure,
  finishedAt: z.number(),
  status: z.literal("failed"),
  workflowIds: z.array(z.string()).min(1),
});
const zSucceededFields = z.object({
  acknowledgedAt: z.null(),
  failure: z.null(),
  finishedAt: z.number(),
  status: z.literal("succeeded"),
  workflowIds: z.array(z.string()).min(1),
});
const taskKindsForState = <TState extends z.ZodRawShape, TEmail extends z.ZodType, TDoc extends z.ZodRawShape>(
  state: TState,
  email: TEmail,
  doc: TDoc
) => {
  const common = { ...doc, ...zCommonFields.shape, ...state };
  const profile = { ...common, profileId: zid("profiles") };
  return z.discriminatedUnion("kind", [
    z.object({ ...common, email, kind: z.literal(kinds[0]) }),
    z.object({ ...profile, kind: z.literal(kinds[1]), newsConfirmationId: zid("newsConfirmations") }),
    z.object({ ...profile, ebookDownloadId: zid("ebookDownloads"), kind: z.literal(kinds[2]) }),
    z.object({ ...profile, kind: z.literal(kinds[3]), subscribed: z.boolean() }),
  ]);
};

const taskStates = <TDoc extends z.ZodRawShape>(doc: TDoc) => {
  const pending = taskKindsForState(zPendingFields.shape, zCanonicalEmail, doc);
  const failed = taskKindsForState(zFailedFields.shape, zCanonicalEmail, doc);
  const succeeded = taskKindsForState(zSucceededFields.shape, z.null(), doc);
  return z.union([...pending.options, ...failed.options, ...succeeded.options]);
};

export const zLoopsTaskFields = taskStates({});
export const zLoopsTaskDoc = taskStates(zDocCommon("loopsTasks").shape);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const zCommonCreate = z.object({ idempotencyKey: z.string(), profileId: zid("profiles") });
const zDeleteContactCreate = z.object({ email: zCanonicalEmail, idempotencyKey: z.string(), kind: z.literal(kinds[0]) });
const zSendConfirmationEmailCreate = z.object({
  ...zCommonCreate.shape,
  kind: z.literal(kinds[1]),
  newsConfirmationId: zid("newsConfirmations"),
});
const zSendEbookEmailCreate = z.object({ ...zCommonCreate.shape, ebookDownloadId: zid("ebookDownloads"), kind: z.literal(kinds[2]) });
const zSyncContactCreate = z.object({ ...zCommonCreate.shape, kind: z.literal(kinds[3]), subscribed: z.boolean() });
export const zLoopsTaskCreate = z.discriminatedUnion("kind", [
  zDeleteContactCreate,
  zSendConfirmationEmailCreate,
  zSendEbookEmailCreate,
  zSyncContactCreate,
]);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type LoopsTaskDoc = z.infer<typeof zLoopsTaskDoc>;
export type LoopsTasks = {
  DeleteContactCreate: z.infer<typeof zDeleteContactCreate>;
  DeleteContactDoc: Extract<LoopsTaskDoc, { kind: "deleteContact" }>;
  SyncContactCreate: z.infer<typeof zSyncContactCreate>;
  SyncContactDoc: Extract<LoopsTaskDoc, { kind: "syncContact" }>;
  Create: z.infer<typeof zLoopsTaskCreate>;
  Doc: LoopsTaskDoc;
  FailedDoc: Extract<LoopsTaskDoc, { status: "failed" }>;
  FailedFields: z.infer<typeof zFailedFields>;
  Failure: z.infer<typeof zLoopsTaskFailure>;
  Fields: z.infer<typeof zLoopsTaskFields>;
  Kind: z.infer<typeof zLoopsTaskKind>;
  PendingDoc: Extract<LoopsTaskDoc, { status: "pending" }>;
  SendConfirmationEmailCreate: z.infer<typeof zSendConfirmationEmailCreate>;
  SendConfirmationEmailDoc: Extract<LoopsTaskDoc, { kind: "sendConfirmationEmail" }>;
  SendEbookEmailCreate: z.infer<typeof zSendEbookEmailCreate>;
  SendEbookEmailDoc: Extract<LoopsTaskDoc, { kind: "sendEbookEmail" }>;
  Status: z.infer<typeof zLoopsTaskStatus>;
  SucceededFields: z.infer<typeof zSucceededFields>;
};
