import { FunctionImpl, GroupImpl } from "@confect/server";
import { Layer as L } from "effect";

import { requireActivePrivacyNotice } from "../data/legal-texts";
import databaseSchema from "./_generated/schema";
import spec from "./legalTexts.spec";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const requireActivePrivacyNoticeImpl = FunctionImpl.make(databaseSchema, spec, "requireActivePrivacyNotice", requireActivePrivacyNotice);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(requireActivePrivacyNoticeImpl), GroupImpl.finalize);
