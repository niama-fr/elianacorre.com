import { describe, expect, it, vi } from "vitest";
import { submitContact } from "./contacts";

const validContact = {
  email: "eliana@example.com",
  forename: "Eliana",
  message: "Bonjour",
  surname: "Corré",
};

describe("contact submission", () => {
  it("rejects invalid values before persistence", async () => {
    const saveContact = vi.fn();

    await expect(submitContact({ ...validContact, email: "invalid" }, saveContact)).rejects.toThrow();
    expect(saveContact).not.toHaveBeenCalled();
  });

  it("persists validated contact values", async () => {
    const saveContact = vi.fn(async () => undefined);

    await submitContact(validContact, saveContact);

    expect(saveContact).toHaveBeenCalledOnce();
    expect(saveContact).toHaveBeenCalledWith(validContact);
  });
});
