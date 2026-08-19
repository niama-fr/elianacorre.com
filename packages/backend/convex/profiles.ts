import { Effect as E } from "effect";

import { CurrentProfile, currentProfileLayer } from "../runtime/current-profile";
import { currentProfile as currentProfileDefinition } from "../runtime/profiles-contract";
import { query } from "./_generated/server";

export const current = currentProfileDefinition.register(query, {
  handler: E.fn(function* (_args: Record<string, never>) {
    return yield* CurrentProfile;
  }),
  layer: currentProfileLayer,
});
