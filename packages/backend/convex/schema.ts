import { zContactFields } from "@ec/domain/contacts";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  contacts: defineTable(zodOutputToConvex(zContactFields)),
});
