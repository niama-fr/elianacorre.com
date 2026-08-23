import { Effect as E } from "effect";
import { base64url } from "jose";

const encoder = new TextEncoder();

export const hashCanonicalEmail = E.fn(function* ({ email, secret }: { email: string; secret: string }) {
  const key = yield* E.promise(
    async () => await crypto.subtle.importKey("raw", encoder.encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["sign"])
  );
  const signature = yield* E.promise(async () => await crypto.subtle.sign("HMAC", key, encoder.encode(email)));
  return base64url.encode(new Uint8Array(signature));
});
