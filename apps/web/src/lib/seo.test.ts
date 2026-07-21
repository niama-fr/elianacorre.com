import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createRobotsResponse, createRobotsText } from "@/routes/robots[.]txt";
import { createSitemapResponse } from "@/routes/sitemap[.]xml";
import { applySecurityHeaders } from "@/server";

import { createNoindexHead, createSeoHead, createSitemapXml, INDEXABLE_PATHS, SECURITY_HEADERS } from "./seo";

describe("public discovery configuration", () => {
  it("builds complete self-canonical social metadata", () => {
    const head = createSeoHead({ description: "Description", path: "/contact", title: "Contact — Eliana Corré" });
    expect(head.links).toContainEqual({ href: "https://elianacorre.com/contact", rel: "canonical" });
    expect(head.meta).toStrictEqual(
      expect.arrayContaining([
        { content: "Description", name: "description" },
        { content: "https://elianacorre.com/contact", property: "og:url" },
        { content: "summary_large_image", name: "twitter:card" },
      ])
    );
  });

  it("keeps utility pages out of search results", () => {
    expect(createNoindexHead("Connexion").meta).toContainEqual({ content: "noindex, nofollow, noarchive", name: "robots" });
  });

  it("publishes only canonical public pages in the sitemap", () => {
    const sitemap = createSitemapXml();
    for (const path of INDEXABLE_PATHS) expect(sitemap).toContain(new URL(path, "https://elianacorre.com").href);
    expect(sitemap).not.toContain("connexion");
    expect(sitemap).not.toContain("newsletter");
  });

  it("advertises the absolute sitemap and excludes private routes from crawling", () => {
    const robots = createRobotsText();
    expect(robots).toContain("Sitemap: https://elianacorre.com/sitemap.xml");
    expect(robots).toContain("Disallow: /admin/");
    expect(robots).toContain("Disallow: /newsletter/");
  });

  it("serves discovery documents with UTF-8 types and shared-cache policy", () => {
    const responses = [createRobotsResponse(), createSitemapResponse()];
    for (const response of responses) {
      expect(response.headers.get("cache-control")).toContain("stale-while-revalidate");
      expect(response.headers.get("content-type")).toContain("charset=utf-8");
    }
  });

  it("defines the baseline browser security policy", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("applies security headers without changing the response status or body", async () => {
    const response = applySecurityHeaders(new Response("missing", { status: 404 }));
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("missing");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
  });

  it("references only existing production manifest icons", () => {
    const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
    const manifest = JSON.parse(readFileSync(`${publicDirectory}/manifest.json`, "utf-8")) as {
      icons: { src: string }[];
      name: string;
      short_name: string;
    };

    expect(manifest.name).toContain("Eliana Corré");
    expect(manifest.short_name).toBe("Eliana Corré");
    for (const icon of manifest.icons) expect(existsSync(`${publicDirectory}/${icon.src.replace(/^\//u, "")}`)).toBeTruthy();
  });
});
