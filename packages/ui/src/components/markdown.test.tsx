import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownContent } from "./markdown";

describe(MarkdownContent, () => {
  it("renders Markdown through the shared safe renderer", () => {
    const markup = renderToStaticMarkup(<MarkdownContent source={"**Important**\n\n<script>alert('unsafe')</script>"} />);

    expect(markup).toContain("<strong>Important</strong>");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });
});
