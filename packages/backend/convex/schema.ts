import { zContactFields } from "@ec/domain/contacts";
import { defineSchema, defineTable } from "convex/server";
import { zodOutputToConvex } from "convex-helpers/server/zod4";

export default defineSchema({
  contacts: defineTable(zodOutputToConvex(zContactFields)),
});
