import { insertContact } from "@ec/backend/contacts";
import { zContactCreate } from "@ec/domain/contacts";
import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomMutation } from "convex-helpers/server/zod4";

import { mutation } from "./_generated/server";

const zMutation = zCustomMutation(mutation, NoOp);

export const create = zMutation({
  args: zContactCreate,
  handler: ({ db }, args) => insertContact(db, args),
});
