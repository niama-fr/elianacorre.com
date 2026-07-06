import { clientEnv } from "@/config/env";

export const getEbookDownloadUrl = (token: string): string => {
  const url = new URL("/newsletter/ebook", clientEnv.VITE_CONVEX_SITE_URL);
  url.searchParams.set("token", token);
  return url.href;
};
