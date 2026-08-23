import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L } from "effect";

import { CurrentProfile, currentProfileLayer } from "../runtime/current-profile";
import databaseSchema from "./_generated/schema";
import { QueryCtx } from "./_generated/services";
import spec from "./profiles.spec";

// QUERIES -------------------------------------------------------------------------------------------------------------------------------
const current = FunctionImpl.make(databaseSchema, spec, "current", () =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;

    return yield* CurrentProfile.pipe(E.provide(currentProfileLayer(ctx)));
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(current), GroupImpl.finalize);
