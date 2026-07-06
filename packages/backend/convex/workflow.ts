import { WorkflowManager } from "@convex-dev/workflow";

import { components } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: {
      base: 2,
      initialBackoffMs: 1000,
      maxAttempts: 3,
    },
  },
});
