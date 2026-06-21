import type { Contacts } from "@ec/domain/contacts";

type ContactDatabase = {
  insert: (table: "contacts", contact: Contacts["Create"]) => Promise<unknown>;
};

export const insertContact = (db: ContactDatabase, contact: Contacts["Create"]): Promise<unknown> => db.insert("contacts", contact);
