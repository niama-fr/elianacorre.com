import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["sendConfirmationEmail", "sendEbookEmail", "syncContact"] as const;
export const zLoopsTaskKind = z.literal(kinds);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zLoopsTaskStatus = z.literal(["failed", "pending", "succeeded"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonFields = z.object({
  error: z.string().nullable(),
  finishedAt: z.number().nullable(),
  idempotencyKey: z.string(),
  profileId: zid("profiles"),
  status: zLoopsTaskStatus,
  workflowId: z.string().nullable(),
});
const zSendConfirmationEmailFields = z.object({
  ...zCommonFields.shape,
  kind: z.literal(kinds[0]),
  newsConfirmationId: zid("newsConfirmations"),
});
const zSendEbookEmailFields = z.object({
  ...zCommonFields.shape,
  ebookDownloadId: zid("ebookDownloads"),
  kind: z.literal(kinds[1]),
});
const zSyncContactFields = z.object({
  ...zCommonFields.shape,
  kind: z.literal(kinds[2]),
  subscribed: z.boolean(),
});
export const zLoopsTaskFields = z.discriminatedUnion("kind", [zSendConfirmationEmailFields, zSendEbookEmailFields, zSyncContactFields]);

const zSendConfirmationEmailDoc = z.object({ ...zDocCommon("loopsTasks").shape, ...zSendConfirmationEmailFields.shape });
const zSendEbookEmailDoc = z.object({ ...zDocCommon("loopsTasks").shape, ...zSendEbookEmailFields.shape });
const zSyncContactDoc = z.object({ ...zDocCommon("loopsTasks").shape, ...zSyncContactFields.shape });
export const zLoopsTaskDoc = z.discriminatedUnion("kind", [zSendConfirmationEmailDoc, zSendEbookEmailDoc, zSyncContactDoc]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const zCommonCreate = zCommonFields.pick({ idempotencyKey: true, profileId: true });
const zSendConfirmationEmailCreate = z.object({
  ...zCommonCreate.shape,
  kind: z.literal(kinds[0]),
  newsConfirmationId: zid("newsConfirmations"),
});
const zSendEbookEmailCreate = z.object({ ...zCommonCreate.shape, ebookDownloadId: zid("ebookDownloads"), kind: z.literal(kinds[1]) });
const zSyncContactCreate = z.object({ ...zCommonCreate.shape, kind: z.literal(kinds[2]), subscribed: z.boolean() });
export const zLoopsTaskCreate = z.discriminatedUnion("kind", [zSendConfirmationEmailCreate, zSendEbookEmailCreate, zSyncContactCreate]);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LoopsTasks = {
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
