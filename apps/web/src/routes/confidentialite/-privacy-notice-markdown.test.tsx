import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PrivacyNoticeMarkdown } from "./-privacy-notice-markdown";

describe(PrivacyNoticeMarkdown, () => {
  it("renders the supported Markdown as semantic content below the page heading", () => {
    const html = renderToStaticMarkup(
      <PrivacyNoticeMarkdown
        content={`## Vos droits

Un paragraphe avec **une information importante** et [la CNIL](https://www.cnil.fr).

- Accès
- Rectification`}
      />
    );

    expect(html).toMatch(/<h3[^>]*>Vos droits<\/h3>/u);
    expect(html).toContain("<p>Un paragraphe");
    expect(html).toContain("<strong>une information importante</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain('href="https://www.cnil.fr"');
  });

  it("rejects raw HTML and unsafe link protocols", () => {
    const unsafeUrl = ["java", 'script:alert("danger")'].join("");
    const html = renderToStaticMarkup(
      <PrivacyNoticeMarkdown
        content={`## Sécurité\n\n<script>alert("danger")</script>\n\n[Unsafe](${unsafeUrl})\n\n[Protocol relative](//evil.example)`}
      />
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain(["java", "script:"].join(""));
    expect(html).not.toContain("//evil.example");
    expect(html).not.toContain('href=""');
  });

  it("rejects empty Markdown instead of rendering an empty legal notice", () => {
    expect(() => renderToStaticMarkup(<PrivacyNoticeMarkdown content="   " />)).toThrow("EMPTY_PRIVACY_NOTICE_MARKDOWN");
  });
});
