import type { LoopsTasks } from "../schemas/loops-tasks";

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const isLoopsTaskPending = (task: LoopsTasks["Doc"] | null) => task?.status === "pending";
