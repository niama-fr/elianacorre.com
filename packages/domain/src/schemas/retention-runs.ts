import { zDocCommon } from "@ec/domain/schemas/utils";
import z from "zod";

export const zRetentionRunFields = z.object({
  anonymizedFormerProfiles: z.number(),
  anonymizedPendingProfiles: z.number(),
  deletedDownloads: z.number(),
  deletedTechnicalLogs: z.number(),
  failedAt: z.number().nullable(),
  failurePhase: z.literal(["downloads", "profiles", "tasks", "webhooks"]).nullable(),
  finishedAt: z.number().nullable(),
  nextCursor: z.string().nullable(),
  nextPhase: z.literal(["downloads", "profiles", "tasks", "webhooks"]),
  startedAt: z.number(),
  status: z.literal(["completed", "failed", "running"]),
});
export const zRetentionRunDoc = z.object({ ...zDocCommon("retentionRuns").shape, ...zRetentionRunFields.shape });

export type RetentionRuns = {
  Doc: z.infer<typeof zRetentionRunDoc>;
  Fields: z.infer<typeof zRetentionRunFields>;
};
