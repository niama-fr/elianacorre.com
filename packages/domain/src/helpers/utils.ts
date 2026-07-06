import { ConvexError } from "convex/values";

export const getLink = ({ base, path, token }: { base: string; path: string; token: string }) => {
  const link = new URL(path, base);
  link.searchParams.set("token", token);
  return link.href;
};

export const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const createHashedToken = async (token = crypto.randomUUID()) => ({ token, tokenHash: await hashToken(token) });

export const isConvexErrorCode = (error: unknown, code: string) => error instanceof ConvexError && error.data === code;
