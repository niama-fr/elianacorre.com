import { Effect as E, Option as O } from "effect";
import { CompactSign, compactVerify } from "jose";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const encodeSecret = (secret: string) => encoder.encode(secret);

export const createCapabilityToken = E.fn(function* ({ capabilityId, secret }: { capabilityId: string; secret: string }) {
  return yield* E.promise(
    async () => await new CompactSign(encoder.encode(capabilityId)).setProtectedHeader({ alg: "HS256" }).sign(encodeSecret(secret))
  );
});

export const verifyCapabilityToken = E.fn(function* ({ secret, token }: { secret: string; token: string }) {
  return yield* E.tryPromise(async () => await compactVerify(token, encodeSecret(secret), { algorithms: ["HS256"] })).pipe(
    E.map(({ payload }) => O.some(decoder.decode(payload))),
    E.catchCause(() => E.succeed(O.none<string>()))
  );
});
