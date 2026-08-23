import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import newsletter from "../../newsletter.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../newsletter.spec")["default"]>(databaseSchema, newsletter, RegisteredConvexFunction.make);
