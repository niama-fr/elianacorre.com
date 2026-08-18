import type { z } from "@ec/validation/zod";
import { ConvexError } from "convex/values";

export const isConvexErrorCode = (error: unknown, code: string) => error instanceof ConvexError && error.data === code;

export function convexErrorDataFrom<T extends z.ZodType>(error: unknown, schema: T): z.infer<T> | undefined {
  if (!(error instanceof ConvexError)) return;

  const parsed = schema.safeParse(error.data);
  return parsed.success ? parsed.data : undefined;
}
