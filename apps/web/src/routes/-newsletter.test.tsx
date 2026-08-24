import type { Id } from "@ec/backend/types";
import { initialFormState } from "@tanstack/react-form-start";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NewsletterForm } from "@/routes/-newsletter.form";

const ACTIVE_PRIVACY_NOTICE_ID = "k170e5dj9c8heby7eah6c4mr6h7a7tw5" as Id<"legalTexts">;

describe("newsletter consent presentation", () => {
  it("embeds the displayed legal bundle identity in the subscription form", () => {
    const html = renderToStaticMarkup(<NewsletterForm privacyNoticeId={ACTIVE_PRIVACY_NOTICE_ID} formState={initialFormState} />);

    expect(html).toContain(`method="post"`);
    expect(html).toContain(`name="consent"`);
    expect(html).toContain(`name="email"`);
    expect(html).toContain(`id="privacyNoticeId"`);
    expect(html).toContain(`value="${ACTIVE_PRIVACY_NOTICE_ID}"`);
  });
});
