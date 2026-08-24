import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import contactRequests from "../../contactRequests.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../contactRequests.spec")["default"]>(databaseSchema, contactRequests, RegisteredConvexFunction.make);
