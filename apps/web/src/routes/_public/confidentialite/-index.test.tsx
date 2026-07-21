import { describe, expect, it, vi } from "vitest";

import { loadPrivacyPolicy, readPrivacyPolicyHead } from "./index";

describe("Confidentialité route", () => {
  it("publishes privacy-policy metadata", () => {
    expect(readPrivacyPolicyHead()).toStrictEqual({
      links: [{ href: "https://elianacorre.com/confidentialite", rel: "canonical" }],
      meta: [
        { title: "Politique de confidentialité — Eliana Corré" },
        {
          content: "Politique de confidentialité du site elianacorre.com et de la lettre d’Eliana Corré.",
          name: "description",
        },
      ],
    });
  });

  it("returns the exact active bundle selected by Convex", async () => {
    const bundle = { privacyNotice: { content: "## Active notice" } };
    const loadActiveBundle = vi.fn<() => Promise<typeof bundle>>().mockResolvedValue(bundle);

    await expect(loadPrivacyPolicy(loadActiveBundle)).resolves.toStrictEqual({ bundle });
  });

  it.each(["MISSING_ACTIVE_LEGAL_BUNDLE", "MISSING_ACTIVE_PRIVACY_NOTICE", "CONVEX_UNAVAILABLE"])(
    "propagates %s through the route error path",
    async (message) => {
      const loadActiveBundle = vi.fn<() => Promise<never>>().mockRejectedValue(new Error(message));

      await expect(loadPrivacyPolicy(loadActiveBundle)).rejects.toThrow(message);
    }
  );
});
