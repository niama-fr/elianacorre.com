import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["deleteContact", "sendConfirmationEmail", "sendEbookEmail", "syncContact"] as const;
export const zLoopsTaskKind = z.literal(kinds);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zLoopsTaskStatus = z.literal(["failed", "pending", "succeeded"]);

// FAILURE ---------------------------------------------------------------------------------------------------------------------------------
export const loopsTaskRetriableFailures = ["network", "rateLimited", "server"] as const;
export const loopsTaskFailures = [...loopsTaskRetriableFailures, "authentication", "missingResource", "unknown", "validation"] as const;
export const zLoopsTaskFailure = z.literal(loopsTaskFailures);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonTaskFields = z.object({
  idempotencyKey: z.string(),
  replayCount: z.number(),
});
const zPendingTaskFields = z.object({
  acknowledgedAt: z.null(),
  failure: z.null(),
  finishedAt: z.null(),
  status: z.literal("pending"),
  workflowIds: z.array(z.string()),
});
const zFailedTaskFields = z.object({
  acknowledgedAt: z.number().nullable(),
  failure: zLoopsTaskFailure,
  finishedAt: z.number(),
  status: z.literal("failed"),
  workflowIds: z.array(z.string()).min(1),
});
const zSucceededTaskFields = z.object({
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
  const common = { ...doc, ...zCommonTaskFields.shape, ...state };
  const profile = { ...common, profileId: zid("profiles") };
  return z.discriminatedUnion("kind", [
    z.object({ ...common, email, kind: z.literal(kinds[0]) }),
    z.object({ ...profile, kind: z.literal(kinds[1]), newsConfirmationId: zid("newsConfirmations") }),
    z.object({ ...profile, ebookDownloadId: zid("ebookDownloads"), kind: z.literal(kinds[2]) }),
    z.object({ ...profile, kind: z.literal(kinds[3]), subscribed: z.boolean() }),
  ]);
};

const taskStates = <TDoc extends z.ZodRawShape>(doc: TDoc) =>
  z.discriminatedUnion("status", [
    taskKindsForState(zPendingTaskFields.shape, zCanonicalEmail, doc),
    taskKindsForState(zFailedTaskFields.shape, zCanonicalEmail, doc),
    taskKindsForState(zSucceededTaskFields.shape, z.null(), doc),
  ]);

export const zLoopsTaskFields = taskStates({});

const zDocFields = zDocCommon("loopsTasks").shape;
export const zLoopsTaskDoc = taskStates(zDocFields);

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
  Fields: z.infer<typeof zLoopsTaskFields>;
  Kind: z.infer<typeof zLoopsTaskKind>;
  SendConfirmationEmailCreate: z.infer<typeof zSendConfirmationEmailCreate>;
  SendConfirmationEmailDoc: Extract<LoopsTaskDoc, { kind: "sendConfirmationEmail" }>;
  SendEbookEmailCreate: z.infer<typeof zSendEbookEmailCreate>;
  SendEbookEmailDoc: Extract<LoopsTaskDoc, { kind: "sendEbookEmail" }>;
  Status: z.infer<typeof zLoopsTaskStatus>;
};
