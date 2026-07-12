import { base64url } from "jose";

const encoder = new TextEncoder();

const importHmacKey = async (secret: string) =>
  await crypto.subtle.importKey("raw", encoder.encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);

export const hashCanonicalEmail = async ({ email, secret }: { email: string; secret: string }) => {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(email));
  return base64url.encode(new Uint8Array(signature));
};
