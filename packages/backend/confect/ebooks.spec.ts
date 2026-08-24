import { FunctionSpec, GroupSpec } from "@confect/core";
import { EbookNotFound } from "@ec/domain/errors/ebooks";
import { sAuthError } from "@ec/domain/schemas/auth";
import { sEbookCreate, sEbookDto } from "@ec/domain/schemas/ebooks";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Effect as E, Schema as S } from "effect";

import { Id } from "./_generated/id";
import ebooks from "./_generated/tables/ebooks";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const sRequestRecoveryArgs = S.Struct({
  email: sCanonicalEmail,
  website: S.Trim.pipe(S.withDecodingDefault(E.succeed(""))),
});

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({}),
      error: () => sAuthError,
      name: "list",
      returns: () => S.Array(sEbookDto),
    })
  )
  // MUTATIONS -----------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sEbookCreate,
      error: () => sAuthError,
      name: "create",
      returns: () => S.Union([S.Struct({ data: Id("ebooks") }), S.Struct({ error: S.Literal("INVALID_STORAGE_DOC") })]),
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => S.Struct({ ebookId: Id("ebooks") }),
      error: () => S.Union([sAuthError, EbookNotFound]),
      name: "publish",
      returns: () => Id("ebooks"),
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sRequestRecoveryArgs,
      name: "requestRecovery",
      returns: () => S.Null,
    })
  )
  // INTERNAL QUERIES ----------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalQuery({
      args: () => S.Struct({ token: S.String }),
      name: "resolveDownload",
      returns: () =>
        S.NullOr(
          S.Struct({
            downloadCreatedAt: S.Finite,
            ebook: ebooks.Doc,
            latestIssuanceAt: S.Finite,
            unsubscribedAt: S.NullOr(S.Finite),
          })
        ),
    })
  );
