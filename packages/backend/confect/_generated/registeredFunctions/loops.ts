import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import loops from "../../loops.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../loops.spec")["default"]>(databaseSchema, loops, RegisteredConvexFunction.make);
