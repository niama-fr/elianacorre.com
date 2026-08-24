import { Effect as E } from "effect";

import { MutationCtx } from "../confect/_generated/services";

// REQUEST IP ------------------------------------------------------------------------------------------------------------------------------
export const getRequestIp = E.fn(function* () {
  const ctx = yield* MutationCtx;
  const metadata = yield* E.tryPromise({
    catch: () => null,
    try: async () => await ctx.meta.getRequestMetadata(),
  }).pipe(E.orElseSucceed(() => null));
  return metadata?.ip ?? "unknown";
});
