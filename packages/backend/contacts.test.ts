import { insertContact } from "@ec/backend/contacts";
import { describe, expect, it, vi } from "vitest";

const validContact = {
  email: "eliana@example.com",
  forename: "Eliana",
  message: "Bonjour",
  surname: "Corré",
};

describe("contact persistence", () => {
  it("inserts validated contact values", async () => {
    const insert = vi.fn<(table: "contacts", contact: typeof validContact) => Promise<string>>(
      async () => await Promise.resolve("contact-id")
    );

    await insertContact({ insert }, validContact);

    expect(insert).toHaveBeenCalledExactlyOnceWith("contacts", validContact);
  });
});
