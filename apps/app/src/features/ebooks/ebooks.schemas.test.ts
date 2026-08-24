// @vitest-environment jsdom

import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { validationMessage } from "@/form/validation";
import * as m from "@/paraglide/messages";

import { EBOOK_CREATE_ISSUE, sEbookCreate } from "./ebooks.schemas";

describe("E-book form validation", () => {
  it.each([
    ["missing title", { file: new File(["%PDF"], "ebook.pdf", { type: "application/pdf" }), title: "" }, EBOOK_CREATE_ISSUE.titleRequired],
    [
      "invalid file type",
      { file: new File(["text"], "ebook.txt", { type: "text/plain" }), title: "Guide" },
      EBOOK_CREATE_ISSUE.fileInvalid,
    ],
    ["missing file", { file: null, title: "Guide" }, EBOOK_CREATE_ISSUE.fileInvalid],
  ])("emits a stable identifier for %s", (_case, input, identifier) => {
    expect(() => S.decodeSync(sEbookCreate)(input)).toThrow(identifier);
  });

  it("maps stable identifiers to the feature's Paraglide messages", () => {
    expect(validationMessage(EBOOK_CREATE_ISSUE.titleRequired)).toBe(m.wide_berries_stop());
    expect(validationMessage(EBOOK_CREATE_ISSUE.fileInvalid)).toBe(m.dull_things_work());
    expect(validationMessage(EBOOK_CREATE_ISSUE.fileSizeInvalid)).toBe(m.tiny_mugs_study());
  });
});
