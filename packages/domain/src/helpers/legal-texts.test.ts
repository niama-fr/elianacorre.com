import { describe, expect, it } from "vitest";

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
    expect(requiredContent.every((content) => PRIVACY_NOTICE.content.includes(content))).toBeTruthy();
    expect(PRIVACY_NOTICE.content).not.toContain("1A rue Gérard de Nerval");
    expect(PRIVACY_NOTICE.content).not.toContain("confidentialite@elianacorre.com");
  });
});
