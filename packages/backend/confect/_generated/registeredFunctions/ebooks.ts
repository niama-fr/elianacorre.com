import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import ebooks from "../../ebooks.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../ebooks.spec")["default"]>(databaseSchema, ebooks, RegisteredConvexFunction.make);
