import { ConvexError } from "convex/values";

export const isConvexErrorCode = (error: unknown, code: string) => error instanceof ConvexError && error.data === code;
