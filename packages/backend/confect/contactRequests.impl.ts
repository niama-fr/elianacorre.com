import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L } from "effect";

import { submitContactRequest } from "../features/contact-requests";
import { getRequestIp } from "../infra/request-metadata";
import databaseSchema from "./_generated/schema";
import spec from "./contactRequests.spec";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const create = FunctionImpl.make(databaseSchema, spec, "create", (args) =>
  E.gen(function* () {
    const requestIp = yield* getRequestIp();
    yield* submitContactRequest({ ...args, now: Date.now(), requestIp }).pipe(
      E.catchTags({ HoneypotTriggered: () => E.void, RateLimitExceeded: () => E.void })
    );
    return null;
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(create), GroupImpl.finalize);
