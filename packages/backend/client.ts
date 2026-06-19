import { ConvexHttpClient } from "convex/browser";

export const createConvexHttpClient = (url: string) => new ConvexHttpClient(url);
