import type { Contacts } from "@ec/domain/contacts";

type ContactDatabase = {
  insert: (table: "contacts", contact: Contacts["Create"]) => Promise<unknown>;
};

export const insertContact = async (db: ContactDatabase, contact: Contacts["Create"]): Promise<unknown> =>
  await db.insert("contacts", contact);
