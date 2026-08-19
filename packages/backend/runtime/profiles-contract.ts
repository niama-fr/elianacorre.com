import { FunctionSpec } from "@confect/core";
import { sProfileDoc } from "@ec/domain/schemas/profiles";
import { functionModule } from "@niama/effex";
import { Schema as S } from "effect";

import { sAuthenticationRequired } from "./current-profile";

const profiles = functionModule("profiles");

export const currentProfile = profiles.query(
  FunctionSpec.publicQuery({
    args: () => S.Struct({}),
    error: () => sAuthenticationRequired,
    name: "current",
    returns: () => sProfileDoc,
  })
);
