import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import cache from "../../cache.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../cache.spec")["default"]>(databaseSchema, cache, RegisteredConvexFunction.make);
