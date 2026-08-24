import { FunctionImpl, GroupImpl } from "@confect/server";
import { PRIVACY_NOTICE } from "@ec/domain/helpers/legal-texts";
import { sProfileAdminsSeed } from "@ec/domain/schemas/profiles";
import { Config, Effect as E, Layer as L, Option as O, Schema as S } from "effect";

import { getActivePrivacyNotice } from "../data/legal-texts";
import { ensureAdminProfileId } from "../data/profiles";
import { publishPrivacyNotice } from "../features/legal-texts";
import databaseSchema from "./_generated/schema";
import spec from "./seed.spec";

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const initImpl = FunctionImpl.make(databaseSchema, spec, "init", () =>
  E.gen(function* () {
    const whitelist = yield* Config.string("WHITELIST_SEED").pipe(E.orDie);
    const emails = yield* S.decodeEffect(sProfileAdminsSeed)(whitelist).pipe(E.orDie);
    const [publishedBy] = yield* E.forEach(emails, ensureAdminProfileId);
    const privacyNotice = yield* getActivePrivacyNotice();

    if (O.isNone(privacyNotice) || privacyNotice.value.content !== PRIVACY_NOTICE)
      yield* publishPrivacyNotice({ content: PRIVACY_NOTICE, publishedBy });

    return null;
  })
);

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(initImpl), GroupImpl.finalize);
