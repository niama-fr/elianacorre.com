import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L } from "effect";

import { createEbook, listEbooks } from "../data/ebooks";
import { publishEbook, requestEbookRecovery, resolveEbookDownloadFacts } from "../features/ebooks";
import { currentAdminLayer } from "../infra/current-profile";
import { getRequestIp } from "../infra/request-metadata";
import databaseSchema from "./_generated/schema";
import { MutationCtx, QueryCtx } from "./_generated/services";
import spec from "./ebooks.spec";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const list = FunctionImpl.make(databaseSchema, spec, "list", () =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* listEbooks().pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const create = FunctionImpl.make(databaseSchema, spec, "create", (args) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;

    return yield* createEbook({ ...args, now: Date.now() }).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const publish = FunctionImpl.make(databaseSchema, spec, "publish", ({ ebookId }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* publishEbook(ebookId, { now: Date.now() }).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const requestRecovery = FunctionImpl.make(databaseSchema, spec, "requestRecovery", (args) =>
  E.gen(function* () {
    const requestIp = yield* getRequestIp();
    yield* requestEbookRecovery({ ...args, now: Date.now(), requestIp }).pipe(
      E.catchTags({ HoneypotTriggered: () => E.void, RateLimitExceeded: () => E.void })
    );
    return null;
  })
);

// INTERNAL QUERIES ------------------------------------------------------------------------------------------------------------------------
const resolveDownload = FunctionImpl.make(databaseSchema, spec, "resolveDownload", ({ token }) => resolveEbookDownloadFacts(token));

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(list),
  L.provide(create),
  L.provide(publish),
  L.provide(requestRecovery),
  L.provide(resolveDownload),
  GroupImpl.finalize
);
