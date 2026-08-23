import { FunctionImpl, GroupImpl } from "@confect/server";
import { PRIVACY_NOTICE } from "@ec/domain/helpers/legal-texts";
import { sProfileAdminsSeed } from "@ec/domain/schemas/profiles";
import { Effect as E, Layer as L, Option as O, Schema as S } from "effect";

import { publishPrivacyNotice } from "../business/legal-texts";
import { env } from "../convex/_generated/server";
import { getActivePrivacyNotice } from "../data/legal-texts";
import { ensureAdminProfileId } from "../data/profiles";
import databaseSchema from "./_generated/schema";
import spec from "./seed.spec";

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const initImpl = FunctionImpl.make(databaseSchema, spec, "init", () =>
  E.gen(function* () {
    const emails = yield* S.decodeEffect(sProfileAdminsSeed)(env.WHITELIST_SEED).pipe(E.orDie);
    const [publishedBy] = yield* E.forEach(emails, ensureAdminProfileId);
    const privacyNotice = yield* getActivePrivacyNotice();

    if (O.isNone(privacyNotice) || privacyNotice.value.content !== PRIVACY_NOTICE)
      yield* publishPrivacyNotice({ content: PRIVACY_NOTICE, publishedBy });

    return null;
  })
);

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(initImpl), GroupImpl.finalize);
