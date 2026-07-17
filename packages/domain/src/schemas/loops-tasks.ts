import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["deleteContact", "sendConfirmationEmail", "sendEbookEmail", "syncContact"] as const;
export const zLoopsTaskKind = z.literal(kinds);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zLoopsTaskStatus = z.literal(["failed", "pending", "succeeded"]);
export const zLoopsTaskFailureCategory = z.literal([
  "authentication",
  "missingResource",
  "network",
  "rateLimited",
  "server",
  "unknown",
  "validation",
]);
export const zLoopsTaskFailureCode = z.literal(["LOOPS_REQUEST_FAILED", "UNSTRUCTURED_LOOPS_FAILURE"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonFields = z.object({
  acknowledgedAt: z.number().nullable(),
  alertedAt: z.number().nullable(),
  failureCategory: zLoopsTaskFailureCategory.nullable(),
  failureCode: zLoopsTaskFailureCode.nullable(),
  failureStatus: z.number().nullable(),
  finishedAt: z.number().nullable(),
  idempotencyKey: z.string(),
  replayCount: z.number(),
  status: zLoopsTaskStatus,
  workflowId: z.string().nullable(),
  workflowIds: z.array(z.string()),
});
const zProfileTaskFields = z.object({ ...zCommonFields.shape, profileId: zid("profiles") });
const zDeleteContactFields = z.object({ ...zCommonFields.shape, email: zCanonicalEmail.nullable(), kind: z.literal(kinds[0]) });
const zSendConfirmationEmailFields = z.object({
  ...zProfileTaskFields.shape,
  kind: z.literal(kinds[1]),
  newsConfirmationId: zid("newsConfirmations"),
});
const zSendEbookEmailFields = z.object({
  ...zProfileTaskFields.shape,
  ebookDownloadId: zid("ebookDownloads"),
  kind: z.literal(kinds[2]),
});
const zSyncContactFields = z.object({
  ...zProfileTaskFields.shape,
  kind: z.literal(kinds[3]),
  subscribed: z.boolean(),
});
const zLoopsTaskFieldsByKind = z.discriminatedUnion("kind", [
  zDeleteContactFields,
  zSendConfirmationEmailFields,
  zSendEbookEmailFields,
  zSyncContactFields,
]);
const hasValidTaskState = (task: z.infer<typeof zLoopsTaskFieldsByKind>) => {
  const hasNoFailure =
    task.acknowledgedAt === null &&
    task.alertedAt === null &&
    task.failureCategory === null &&
    task.failureCode === null &&
    task.failureStatus === null;
  const hasExecutableDeletionAddress = task.kind !== "deleteContact" || task.email !== null;
  if (task.status === "pending") return hasNoFailure && task.finishedAt === null && hasExecutableDeletionAddress;
  if (task.status === "failed")
    return (
      task.alertedAt !== null &&
      task.failureCategory !== null &&
      task.failureCode !== null &&
      task.finishedAt !== null &&
      task.workflowId !== null &&
      hasExecutableDeletionAddress
    );
  return hasNoFailure && task.finishedAt !== null && task.workflowId !== null && (task.kind !== "deleteContact" || task.email === null);
};
export const zLoopsTaskFields = zLoopsTaskFieldsByKind.refine(hasValidTaskState, { message: "Invalid Loops task state" });

const zDocFields = zDocCommon("loopsTasks").shape;
export const zLoopsTaskDoc = z
  .discriminatedUnion("kind", [
    z.object({ ...zDocFields, ...zDeleteContactFields.shape }),
    z.object({ ...zDocFields, ...zSendConfirmationEmailFields.shape }),
    z.object({ ...zDocFields, ...zSendEbookEmailFields.shape }),
    z.object({ ...zDocFields, ...zSyncContactFields.shape }),
  ])
  .refine(hasValidTaskState, { message: "Invalid Loops task state" })
  .transform((task): WithTaskState<typeof task> => task as WithTaskState<typeof task>);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const zCommonCreate = zProfileTaskFields.pick({ idempotencyKey: true, profileId: true });
const zDeleteContactCreate = z.object({ email: zCanonicalEmail, ...zDeleteContactFields.pick({ idempotencyKey: true, kind: true }).shape });
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
type PendingTaskState = {
  acknowledgedAt: null;
  alertedAt: null;
  failureCategory: null;
  failureCode: null;
  failureStatus: null;
  finishedAt: null;
  status: "pending";
  workflowId: string | null;
};
type FailedTaskState = {
  acknowledgedAt: number | null;
  alertedAt: number;
  failureCategory: z.infer<typeof zLoopsTaskFailureCategory>;
  failureCode: z.infer<typeof zLoopsTaskFailureCode>;
  failureStatus: number | null;
  finishedAt: number;
  status: "failed";
  workflowId: string;
};
type SucceededTaskState = {
  acknowledgedAt: null;
  alertedAt: null;
  failureCategory: null;
  failureCode: null;
  failureStatus: null;
  finishedAt: number;
  status: "succeeded";
  workflowId: string;
};
type StateField = keyof PendingTaskState;
type WithTaskState<T> = T extends { kind: "deleteContact" }
  ? Omit<T, StateField | "email"> &
      ((PendingTaskState & { email: string }) | (FailedTaskState & { email: string }) | (SucceededTaskState & { email: null }))
  : T extends object
    ? Omit<T, StateField> & (FailedTaskState | PendingTaskState | SucceededTaskState)
    : never;
type LoopsTaskDoc = z.infer<typeof zLoopsTaskDoc>;
type LoopsTaskFields = WithTaskState<z.infer<typeof zLoopsTaskFields>>;
export type LoopsTasks = {
  DeleteContactCreate: z.infer<typeof zDeleteContactCreate>;
  DeleteContactDoc: Extract<LoopsTaskDoc, { kind: "deleteContact" }>;
  SyncContactCreate: z.infer<typeof zSyncContactCreate>;
  SyncContactDoc: Extract<LoopsTaskDoc, { kind: "syncContact" }>;
  Create: z.infer<typeof zLoopsTaskCreate>;
  Doc: LoopsTaskDoc;
  Fields: LoopsTaskFields;
  Kind: z.infer<typeof zLoopsTaskKind>;
  SendConfirmationEmailCreate: z.infer<typeof zSendConfirmationEmailCreate>;
  SendConfirmationEmailDoc: Extract<LoopsTaskDoc, { kind: "sendConfirmationEmail" }>;
  SendEbookEmailCreate: z.infer<typeof zSendEbookEmailCreate>;
  SendEbookEmailDoc: Extract<LoopsTaskDoc, { kind: "sendEbookEmail" }>;
  Status: z.infer<typeof zLoopsTaskStatus>;
};
