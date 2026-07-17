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
  acknowledgedAt: z.number().nullable().optional(),
  alertedAt: z.number().nullable().optional(),
  error: z.string().nullable(),
  failureCategory: zLoopsTaskFailureCategory.nullable().optional(),
  failureCode: zLoopsTaskFailureCode.nullable().optional(),
  failureStatus: z.number().nullable().optional(),
  finishedAt: z.number().nullable(),
  idempotencyKey: z.string(),
  replayCount: z.number().optional(),
  status: zLoopsTaskStatus,
  workflowId: z.string().nullable(),
  workflowIds: z.array(z.string()).optional(),
});
const zProfileTaskFields = z.object({ ...zCommonFields.shape, profileId: zid("profiles") });

const zDeleteContactFields = z.object({
  ...zCommonFields.shape,
  email: zCanonicalEmail.nullable(),
  kind: z.literal(kinds[0]),
});
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
export const zLoopsTaskFields = z.discriminatedUnion("kind", [
  zDeleteContactFields,
  zSendConfirmationEmailFields,
  zSendEbookEmailFields,
  zSyncContactFields,
]);

const zDeleteContactDoc = z.object({ ...zDocCommon("loopsTasks").shape, ...zDeleteContactFields.shape });
const zSendConfirmationEmailDoc = z.object({ ...zDocCommon("loopsTasks").shape, ...zSendConfirmationEmailFields.shape });
const zSendEbookEmailDoc = z.object({ ...zDocCommon("loopsTasks").shape, ...zSendEbookEmailFields.shape });
const zSyncContactDoc = z.object({ ...zDocCommon("loopsTasks").shape, ...zSyncContactFields.shape });
export const zLoopsTaskDoc = z.discriminatedUnion("kind", [
  zDeleteContactDoc,
  zSendConfirmationEmailDoc,
  zSendEbookEmailDoc,
  zSyncContactDoc,
]);

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
export type LoopsTasks = {
  DeleteContactCreate: z.infer<typeof zDeleteContactCreate>;
  DeleteContactDoc: z.infer<typeof zDeleteContactDoc>;
  SyncContactCreate: z.infer<typeof zSyncContactCreate>;
  SyncContactDoc: z.infer<typeof zSyncContactDoc>;
  CommonFields: z.infer<typeof zCommonFields>;
  Create: z.infer<typeof zLoopsTaskCreate>;
  Doc: z.infer<typeof zLoopsTaskDoc>;
  Fields: z.infer<typeof zLoopsTaskFields>;
  Kind: z.infer<typeof zLoopsTaskKind>;
  SendConfirmationEmailCreate: z.infer<typeof zSendConfirmationEmailCreate>;
  SendConfirmationEmailDoc: z.infer<typeof zSendConfirmationEmailDoc>;
  SendEbookEmailCreate: z.infer<typeof zSendEbookEmailCreate>;
  SendEbookEmailDoc: z.infer<typeof zSendEbookEmailDoc>;
  Status: z.infer<typeof zLoopsTaskStatus>;
};
