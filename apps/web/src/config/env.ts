import { z } from "zod";

const zClientEnv = z.object({
  VITE_CONVEX_SITE_URL: z.url().optional(),
  VITE_CONVEX_URL: z.url(),
});

const parsedClientEnv = zClientEnv.parse(import.meta.env);

const getConvexSiteUrl = (convexUrl: string, explicitSiteUrl?: string): string => {
  if (explicitSiteUrl !== undefined) return explicitSiteUrl;

  const url = new URL(convexUrl);
  const cloudSuffix = ".convex.cloud";
  if (!url.hostname.endsWith(cloudSuffix))
    throw new Error("VITE_CONVEX_SITE_URL is required when VITE_CONVEX_URL is not hosted on convex.cloud");

  url.hostname = `${url.hostname.slice(0, -cloudSuffix.length)}.convex.site`;
  return url.origin;
};

export const clientEnv = {
  ...parsedClientEnv,
  VITE_CONVEX_SITE_URL: getConvexSiteUrl(parsedClientEnv.VITE_CONVEX_URL, parsedClientEnv.VITE_CONVEX_SITE_URL),
};
