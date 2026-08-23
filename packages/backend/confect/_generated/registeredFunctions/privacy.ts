import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import privacy from "../../privacy.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../privacy.spec")["default"]>(databaseSchema, privacy, RegisteredConvexFunction.make);
