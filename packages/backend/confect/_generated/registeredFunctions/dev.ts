import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import dev from "../../dev.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../dev.spec")["default"]>(databaseSchema, dev, RegisteredConvexFunction.make);
