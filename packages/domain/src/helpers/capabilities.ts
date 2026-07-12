import { CompactSign, compactVerify } from "jose";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const encodeSecret = (secret: string) => encoder.encode(secret);

export const createCapabilityToken = async ({ capabilityId, secret }: { capabilityId: string; secret: string }) =>
  await new CompactSign(encoder.encode(capabilityId)).setProtectedHeader({ alg: "HS256" }).sign(encodeSecret(secret));

export const verifyCapabilityToken = async ({ secret, token }: { secret: string; token: string }): Promise<string | null> => {
  try {
    const { payload } = await compactVerify(token, encodeSecret(secret), { algorithms: ["HS256"] });
    return decoder.decode(payload);
  } catch {
    return null;
  }
};
