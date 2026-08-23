import { FunctionImpl, GroupImpl } from "@confect/server";
import * as E from "effect/Effect";
import * as L from "effect/Layer";

import { createContactRequest } from "../data/contact-requests";
import { ensureContactProfileId } from "../data/profiles";
import databaseSchema from "./_generated/schema";
import spec from "./contactRequests.spec";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const create = FunctionImpl.make(databaseSchema, spec, "create", ({ email, firstName, message }) =>
  E.gen(function* () {
    const profileId = yield* ensureContactProfileId({ email, firstName });
    return yield* createContactRequest({ message, profileId });
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(create), GroupImpl.finalize);
