import { ConvexHttpClient } from "convex/browser";

// CLIENT ----------------------------------------------------------------------------------------------------------------------------------
export const createConvexHttpClient = (url: string) => new ConvexHttpClient(url);
