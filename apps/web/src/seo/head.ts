// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const SITE_ORIGIN = "https://elianacorre.com";
export const SITE_NAME = "Eliana Corré";
export const DEFAULT_SHARE_IMAGE = "https://ik.imagekit.io/elianacorre/accueil.jpeg";

// NOINDEX ---------------------------------------------------------------------------------------------------------------------------------
export const noindexHead = (title: string) => ({
  meta: [{ title }, { content: "noindex, nofollow, noarchive", name: "robots" }, { content: "no-referrer", name: "referrer" }],
});

// SEO -------------------------------------------------------------------------------------------------------------------------------------
export const seoHead = ({ description, image = DEFAULT_SHARE_IMAGE, path, title }: SeoHeadOpts) => {
  const url = new URL(path, SITE_ORIGIN).href;
  return {
    links: [{ href: url, rel: "canonical" }],
    meta: [
      { title },
      { content: description, name: "description" },
      { content: "index, follow", name: "robots" },
      { content: title, property: "og:title" },
      { content: description, property: "og:description" },
      { content: url, property: "og:url" },
      { content: image, property: "og:image" },
      { content: "fr_FR", property: "og:locale" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: title, name: "twitter:title" },
      { content: description, name: "twitter:description" },
      { content: image, name: "twitter:image" },
    ],
  };
};
type SeoHeadOpts = { description: string; image?: string; path: string; title: string };
