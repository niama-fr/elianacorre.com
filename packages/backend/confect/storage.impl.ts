import { FunctionImpl, GroupImpl } from "@confect/server";
import { Duration as D, Effect as E, Layer as L } from "effect";

import { generateStorageUploadUrl } from "../data/storage";
import { ORPHAN_STORAGE_GRACE_MS, purgeOrphanStorageBatch } from "../features/storage";
import { currentAdminLayer } from "../infra/current-profile";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationCtx, Scheduler } from "./_generated/services";
import spec from "./storage.spec";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const generateUploadUrl = FunctionImpl.make(databaseSchema, spec, "generateUploadUrl", () =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    return yield* generateStorageUploadUrl().pipe(
      E.map(({ href }) => href),
      E.provide(currentAdminLayer(ctx))
    );
  })
);

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const purgeOrphans = FunctionImpl.make(databaseSchema, spec, "purgeOrphans", ({ before, cursor }) =>
  E.gen(function* () {
    const cutoff = before ?? Date.now() - ORPHAN_STORAGE_GRACE_MS;
    const result = yield* purgeOrphanStorageBatch({ before: cutoff, cursor });

    if (!result.done) {
      const scheduler = yield* Scheduler;
      yield* scheduler.runAfter(D.millis(0), refs.internal.storage.purgeOrphans, { before: cutoff, cursor: result.cursor });
    }

    return result;
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(generateUploadUrl), L.provide(purgeOrphans), GroupImpl.finalize);
