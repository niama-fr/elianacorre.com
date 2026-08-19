/* oxlint-disable eslint/require-await, typescript/return-await -- Effect.promise adapters return Convex promises directly. */
import type { Id } from "@ec/backend/types";
import { Context, Effect as E, Layer as L } from "effect";

import type { MutationCtx, QueryCtx } from "../convex/_generated/server";

type StorageReaderService = {
  readonly getDoc: (id: Id<"_storage">) => E.Effect<StorageDoc | null>;
  readonly getUrl: (id: Id<"_storage">) => E.Effect<string | null>;
};
type StorageWriterService = {
  readonly generateUploadUrl: E.Effect<string>;
};

type StorageDoc = {
  readonly _creationTime: number;
  readonly _id: Id<"_storage">;
  readonly contentType?: string;
  readonly sha256: string;
  readonly size: number;
};

export const StorageReader = Context.Service<StorageReaderService>("elianacorre/StorageReader");
export const StorageWriter = Context.Service<StorageWriterService>("elianacorre/StorageWriter");

export const storageReaderLayer = (ctx: MutationCtx | QueryCtx) =>
  L.succeed(StorageReader, {
    getDoc: (id) => E.promise(async () => ctx.db.system.get("_storage", id)),
    getUrl: (id) => E.promise(async () => ctx.storage.getUrl(id)),
  });

export const storageWriterLayer = (ctx: MutationCtx) =>
  L.succeed(StorageWriter, {
    generateUploadUrl: E.promise(async () => ctx.storage.generateUploadUrl()),
  });
