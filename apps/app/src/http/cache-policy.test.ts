import { describe, expect, it } from "vitest";

import { applyCachePolicy } from "./cache-policy";

describe("authenticated application cache policy", () => {
  it.each([
    new Response("page", { headers: { "Content-Type": "text/html" } }),
    new Response(null, { headers: { Location: "/connexion" }, status: 303 }),
    new Response("missing", { status: 404 }),
    new Response("failure", { status: 500 }),
  ])("makes every response private and non-cacheable", (sourceResponse) => {
    const response = applyCachePolicy({ response: sourceResponse });

    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("cloudflare-cdn-cache-control")).toBe("no-store");
  });
});
