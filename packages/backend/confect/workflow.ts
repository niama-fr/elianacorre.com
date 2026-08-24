import { WorkflowManager } from "@convex-dev/workflow";

import { components } from "./_generated/components";

export const workflowManager = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: {
      base: 2,
      initialBackoffMs: 1000,
      maxAttempts: 3,
    },
  },
});
