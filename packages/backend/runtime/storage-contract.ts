import { FunctionSpec } from "@confect/core";
import { functionModule } from "@niama/effex";
import { Schema as S } from "effect";

import { sAuthenticationRequired, sAuthorizationRequired } from "./current-profile";

const storage = functionModule("storage");

export const generateUploadUrl = storage.mutation(
  FunctionSpec.publicMutation({
    args: () => S.Struct({}),
    error: () => S.Union([sAuthenticationRequired, sAuthorizationRequired]),
    name: "generateUploadUrl",
    returns: () => S.String,
  })
);
