import { zContactFields } from "@ec/domain/schemas/contacts";
import { zEbookFields } from "@ec/domain/schemas/ebooks";
import { zProfileFields } from "@ec/domain/schemas/profiles";
import { zodOutputToConvex } from "convex-helpers/server/zod4";
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  contacts: defineTable(zodOutputToConvex(zContactFields)),
  ebooks: defineTable(zodOutputToConvex(zEbookFields)).index("by_status", ["status"]).index("by_version", ["version"]),
  profiles: defineTable(zodOutputToConvex(zProfileFields))
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_user", ["userId"]),
});
