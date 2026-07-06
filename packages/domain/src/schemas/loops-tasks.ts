import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zDocCommon } from "./utils";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const zLoopsTaskKind = z.literal(["syncContact", "sendConfirmationEmail", "sendEbookEmail"]);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zLoopsTaskStatus = z.literal(["failed", "pending", "succeeded"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zLoopsTaskCommonFields = z.object({
  error: z.string().nullable(),
  idempotencyKey: z.string(),
  profileId: zid("profiles"),
  status: zLoopsTaskStatus,
  succeededAt: z.number().nullable(),
});

const zLoopsTaskSendConfirmationEmailFields = zLoopsTaskCommonFields.extend({
  kind: z.literal("sendConfirmationEmail"),
  linkToken: z.string(),
});

const zLoopsTaskSendEbookEmailFields = zLoopsTaskCommonFields.extend({
  kind: z.literal("sendEbookEmail"),
  linkToken: z.string(),
});

const zLoopsTaskSyncContactFields = zLoopsTaskCommonFields.extend({ kind: z.literal("syncContact") });

export const zLoopsTaskFields = z.discriminatedUnion("kind", [
  zLoopsTaskSendConfirmationEmailFields,
  zLoopsTaskSendEbookEmailFields,
  zLoopsTaskSyncContactFields,
]);

export const zLoopsTaskSendConfirmationEmailDoc = zLoopsTaskSendConfirmationEmailFields.extend(zDocCommon("loopsTasks").shape);

export const zLoopsTaskSendEbookEmailDoc = zLoopsTaskSendEbookEmailFields.extend(zDocCommon("loopsTasks").shape);

export const zLoopsTaskSyncContactDoc = zLoopsTaskSyncContactFields.extend(zDocCommon("loopsTasks").shape);

export const zLoopsTaskDoc = z.discriminatedUnion("kind", [
  zLoopsTaskSendConfirmationEmailDoc,
  zLoopsTaskSendEbookEmailDoc,
  zLoopsTaskSyncContactDoc,
]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const zLoopsTaskCommonCreate = zLoopsTaskCommonFields.pick({ idempotencyKey: true, profileId: true });
export const zLoopsTaskCreate = z.discriminatedUnion("kind", [
  zLoopsTaskCommonCreate.extend({ kind: z.literal("sendConfirmationEmail"), linkToken: z.string() }),
  zLoopsTaskCommonCreate.extend({ kind: z.literal("sendEbookEmail"), linkToken: z.string() }),
  zLoopsTaskCommonCreate.extend({ kind: z.literal("syncContact") }),
]);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LoopsTasks = {
  SyncContactDoc: z.infer<typeof zLoopsTaskSyncContactDoc>;
  CommonFields: z.infer<typeof zLoopsTaskCommonFields>;
  Create: z.infer<typeof zLoopsTaskCreate>;
  Doc: z.infer<typeof zLoopsTaskDoc>;
  Fields: z.infer<typeof zLoopsTaskFields>;
  Kind: z.infer<typeof zLoopsTaskKind>;
  SendConfirmationEmailDoc: z.infer<typeof zLoopsTaskSendConfirmationEmailDoc>;
  SendEbookEmailDoc: z.infer<typeof zLoopsTaskSendEbookEmailDoc>;
  Status: z.infer<typeof zLoopsTaskStatus>;
};
