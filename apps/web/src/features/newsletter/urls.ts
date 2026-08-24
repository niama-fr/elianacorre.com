import { publicEnv } from "@/config/env";

export const getEbookDownloadUrl = (token: string): string => {
  const url = new URL("/newsletter/ebook", publicEnv.VITE_CONVEX_SITE_URL);
  url.searchParams.set("token", token);
  return url.href;
};
