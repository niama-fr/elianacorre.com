import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sMarkdownContent } from "../schemas/legal-texts";
import { PRIVACY_NOTICE } from "./legal-texts";

describe("newsletter privacy notice", () => {
  it("publishes the approved French operational and privacy information", () => {
    const requiredContent = [
      "107 chemin de ligne, Les Canots",
      "contact@elianacorre.com",
      "Convex",
      "Loops",
      "Cloudflare",
      "Google",
      "30 jours",
      "90 jours",
      "trois ans",
      "L’ouverture des e-mails n’est pas suivie",
      "Les clics ne sont pas suivis",
      "clauses contractuelles types",
    ];
    expect(requiredContent.every((content) => PRIVACY_NOTICE.includes(content))).toBeTruthy();
    expect(PRIVACY_NOTICE).not.toContain("1A rue Gérard de Nerval");
    expect(PRIVACY_NOTICE).not.toContain("confidentialite@elianacorre.com");
  });

  it("stores the privacy notice using the explicit Markdown contract", () => {
    expect(PRIVACY_NOTICE).toContain("## Responsable du traitement");
    expect(PRIVACY_NOTICE).toContain("[contact@elianacorre.com](mailto:contact@elianacorre.com)");
    expect(PRIVACY_NOTICE).toContain("- Convex");
  });

  it("rejects blank Markdown at the storage boundary", () => {
    expect(S.is(sMarkdownContent)("   ")).toBeFalsy();
  });
});
