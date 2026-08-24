import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L } from "effect";

import { confirmNewsletter, subscribeToNewsletter } from "../features/newsletter";
import { createNewsletterDataExport } from "../features/newsletter-export";
import { currentAdminLayer } from "../infra/current-profile";
import { getRequestIp } from "../infra/request-metadata";
import databaseSchema from "./_generated/schema";
import { QueryCtx } from "./_generated/services";
import spec from "./newsletter.spec";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const exportData = FunctionImpl.make(databaseSchema, spec, "exportData", ({ exportedAt, format }) =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* createNewsletterDataExport(format, exportedAt).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const confirm = FunctionImpl.make(databaseSchema, spec, "confirm", ({ token }) => confirmNewsletter({ now: Date.now(), token }));

const subscribe = FunctionImpl.make(databaseSchema, spec, "subscribe", (args) =>
  E.gen(function* () {
    const requestIp = yield* getRequestIp();
    yield* subscribeToNewsletter({ ...args, now: Date.now(), requestIp }).pipe(
      E.catchTags({ HoneypotTriggered: () => E.void, RateLimitExceeded: () => E.void })
    );
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
