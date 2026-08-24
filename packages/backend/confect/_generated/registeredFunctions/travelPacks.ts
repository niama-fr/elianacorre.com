import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import travelPacks from "../../travelPacks.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../travelPacks.spec")["default"]>(databaseSchema, travelPacks, RegisteredConvexFunction.make);
