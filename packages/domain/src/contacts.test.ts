import { describe, expect, it } from "vitest";
import { zContactCreateValues } from "./contacts";

const validContact = {
  email: "eliana@example.com",
  forename: "Eliana",
  message: "Bonjour",
  surname: "Corré",
};

describe("contact validator", () => {
  it("rejects invalid values", () => {
    expect(zContactCreateValues.safeParse({ ...validContact, email: "invalid" }).success).toBe(false);
  });

  it("returns valid contact values", () => {
    expect(zContactCreateValues.parse(validContact)).toEqual(validContact);
  });
});
