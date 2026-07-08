const encoder = new TextEncoder();

const decodeSecret = (secret: string) => {
  const encoded = secret.includes("_") ? secret.slice(secret.indexOf("_") + 1) : secret;
  return Uint8Array.from(atob(encoded), (character) => character.codePointAt(0) ?? 0);
};

const decodeSignature = (signature: string) => {
  const encoded = signature.includes(",") ? signature.slice(signature.indexOf(",") + 1) : signature;
  return Uint8Array.from(atob(encoded), (character) => character.codePointAt(0) ?? 0);
};

export const verifyLoopsWebhookSignature = async ({ body, id, secret, signature, timestamp }: VerifyOpts) => {
  try {
    const key = await crypto.subtle.importKey("raw", decodeSecret(secret), { hash: "SHA-256", name: "HMAC" }, false, ["verify"]);
    const content = encoder.encode(`${id}.${timestamp}.${body}`);
    const matches = await Promise.all(
      signature.split(" ").map(async (candidate) => await crypto.subtle.verify("HMAC", key, decodeSignature(candidate), content))
    );
    return matches.includes(true);
  } catch {
    return false;
  }
};

type VerifyOpts = { body: string; id: string; secret: string; signature: string; timestamp: string };
