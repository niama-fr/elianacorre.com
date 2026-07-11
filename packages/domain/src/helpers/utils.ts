import { ConvexError } from "convex/values";

export const getLink = ({ base, path, token }: { base: string; path: string; token: string }) => {
  const link = new URL(path, base);
  link.searchParams.set("token", token);
  return link.href;
};

const encodeBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCodePoint(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const decodeBase64Url = (value: string) => {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.codePointAt(0) ?? 0);
};

const importHmacKey = async (secret: string) =>
  await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["sign", "verify"]);

const signValue = async ({ secret, value }: { secret: string; value: string }) => {
  const key = await importHmacKey(secret);
  return encodeBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
};

export const createCapabilityToken = async ({ capabilityId, secret }: { capabilityId: string; secret: string }) =>
  `${capabilityId}.${await signValue({ secret, value: capabilityId })}`;

export const hashCanonicalEmail = async ({ email, secret }: { email: string; secret: string }) => await signValue({ secret, value: email });

export const verifyCapabilityToken = async ({ secret, token }: { secret: string; token: string }): Promise<string | null> => {
  const [capabilityId, signature, ...rest] = token.split(".");
  if (!capabilityId || !signature || rest.length > 0) return null;

  try {
    const key = await importHmacKey(secret);
    const isValid = await crypto.subtle.verify("HMAC", key, decodeBase64Url(signature), new TextEncoder().encode(capabilityId));
    return isValid ? capabilityId : null;
  } catch {
    return null;
  }
};

export const isConvexErrorCode = (error: unknown, code: string) => error instanceof ConvexError && error.data === code;
