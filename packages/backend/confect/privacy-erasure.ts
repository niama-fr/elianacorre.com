import type { Id } from "@ec/backend/types";
import { anyApi, type FunctionReference } from "convex/server";
import { v } from "convex/values";

import type { ProfileErasurePhase } from "../data/profiles";
import { workflowManager } from "./workflow";

const phases: readonly ProfileErasurePhase[] = [
  "ebookIssuances",
  "newsSubscriptions",
  "contactRequests",
  "identities",
  "loopsTasks",
  "loopsWebhooks",
  "newsRestrictions",
];

type ErasureArgs = { email: string; privacyAuditId: Id<"privacyAudits">; profileId: Id<"profiles"> };
const eraseBatchRef: FunctionReference<"mutation", "internal", ErasureArgs & { phase: ProfileErasurePhase }, { done: boolean }> =
  anyApi.privacy.eraseBatch;
const completeErasureRef: FunctionReference<"mutation", "internal", ErasureArgs, boolean> = anyApi.privacy.completeErasure;

export const erasureWorkflow = workflowManager
  .define({
    args: {
      email: v.string(),
      privacyAuditId: v.id("privacyAudits"),
      profileId: v.id("profiles"),
    },
  })
  .handler(async (step, args): Promise<void> => {
    let completed = false;
    let pass = 0;
    while (!completed) {
      for (const phase of phases) {
        let done = false;
        let batch = 0;
        while (!done) {
          ({ done } = await step.runMutation(
            eraseBatchRef,
            { ...args, phase },
            { name: `privacy erasure pass ${pass} ${phase} batch ${batch}` }
          ));
          batch += 1;
        }
      }
      completed = await step.runMutation(completeErasureRef, args, { name: `complete privacy erasure pass ${pass}` });
      pass += 1;
    }
  });
