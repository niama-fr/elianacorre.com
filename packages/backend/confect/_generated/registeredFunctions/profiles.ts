import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import profiles from "../../profiles.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../profiles.spec")["default"]>(databaseSchema, profiles, RegisteredConvexFunction.make);
