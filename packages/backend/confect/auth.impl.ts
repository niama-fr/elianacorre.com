import { FunctionImpl, GroupImpl } from "@confect/server";
import { Layer as L } from "effect";

import { getAuthUser, onCreate, onDelete, onUpdate } from "../runtime/better-auth";
import databaseSchema from "./_generated/schema";
import spec from "./auth.spec";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const getAuthUserImpl = FunctionImpl.make(databaseSchema, spec, "getAuthUser", getAuthUser);

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const onCreateImpl = FunctionImpl.make(databaseSchema, spec, "onCreate", onCreate);
const onUpdateImpl = FunctionImpl.make(databaseSchema, spec, "onUpdate", onUpdate);
const onDeleteImpl = FunctionImpl.make(databaseSchema, spec, "onDelete", onDelete);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(getAuthUserImpl),
  L.provide(onCreateImpl),
  L.provide(onUpdateImpl),
  L.provide(onDeleteImpl),
  GroupImpl.finalize
);
