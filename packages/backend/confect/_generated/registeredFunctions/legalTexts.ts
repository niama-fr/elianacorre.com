import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import legalTexts from "../../legalTexts.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../legalTexts.spec")["default"]>(databaseSchema, legalTexts, RegisteredConvexFunction.make);
