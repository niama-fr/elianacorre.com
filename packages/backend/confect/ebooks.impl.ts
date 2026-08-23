import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L, Option as O } from "effect";

import { publishEbook, requestEbookRecovery, resolveEbookIssuanceFromToken } from "../business/ebooks";
import { createEbook, getEbook, listEbooks } from "../data/ebooks";
import { currentAdminLayer } from "../runtime/current-profile";
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
  requestEbookRecovery({ now: Date.now(), ...args }).pipe(E.as(null))
);

// INTERNAL QUERIES ------------------------------------------------------------------------------------------------------------------------
const resolveDownload = FunctionImpl.make(databaseSchema, spec, "resolveDownload", ({ token }) =>
  E.gen(function* () {
    const issuance = yield* resolveEbookIssuanceFromToken({ now: Date.now(), token });
    return issuance ? O.getOrNull(yield* getEbook(issuance.ebookId)) : null;
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(list),
  L.provide(create),
  L.provide(publish),
  L.provide(requestRecovery),
  L.provide(resolveDownload),
  GroupImpl.finalize
);
