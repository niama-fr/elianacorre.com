import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["deleteContact", "sendConfirmationEmail", "sendEbookEmail", "syncContact"] as const;
export const zLoopsTaskKind = z.literal(kinds);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zLoopsTaskStatus = z.literal(["failed", "pending", "succeeded"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonFields = z.object({
  error: z.string().nullable(),
  finishedAt: z.number().nullable(),
  idempotencyKey: z.string(),
  status: zLoopsTaskStatus,
  workflowId: z.string().nullable(),
});
const zProfileTaskFields = z.object({ ...zCommonFields.shape, profileId: zid("profiles") });

const zDeleteContactFields = z.object({
  ...zCommonFields.shape,
  email: zCanonicalEmail,
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
const zDeleteContactCreate = zDeleteContactFields.pick({ email: true, idempotencyKey: true, kind: true });
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
