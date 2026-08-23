import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L } from "effect";

import { confirmNewsletter, subscribeToNewsletter } from "../business/newsletter";
import { createNewsletterDataExport } from "../business/newsletter-export";
import { currentAdminLayer } from "../runtime/current-profile";
import databaseSchema from "./_generated/schema";
import { QueryCtx } from "./_generated/services";
import spec from "./newsletter.spec";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const exportData = FunctionImpl.make(databaseSchema, spec, "exportData", ({ format }) =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* createNewsletterDataExport(format).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const confirm = FunctionImpl.make(databaseSchema, spec, "confirm", ({ token }) => confirmNewsletter({ now: Date.now(), token }));

const subscribe = FunctionImpl.make(databaseSchema, spec, "subscribe", (args) =>
  E.gen(function* () {
    yield* subscribeToNewsletter({ now: Date.now(), ...args });
    return null;
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(exportData),
  L.provide(confirm),
  L.provide(subscribe),
  GroupImpl.finalize
);
