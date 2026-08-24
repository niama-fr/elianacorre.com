import { VALIDATION_ISSUE } from "@ec/domain/schemas/utils";
import { describe, expect, it } from "vitest";

import { validationMessage } from "./validation";

describe("authenticated form validation", () => {
  it("localizes shared required and slug identifiers", () => {
    expect(validationMessage(VALIDATION_ISSUE.required)).toBe("Ce champ est requis");
    expect(validationMessage(VALIDATION_ISSUE.slugInvalid)).toBe("Utilisez uniquement des minuscules, chiffres et tirets");
  });
});
