import { describe, it } from "@effect/vitest";
import { Effect as E, Option as O } from "effect";

import { createCapabilityToken, verifyCapabilityToken } from "./capabilities";

const capabilityId = "j57a8f9d2e3";
const secret = "test-capability-secret";

describe("capability tokens", () => {
  it.effect("verifies a signed capability identifier without persisting a bearer token", ({ expect }) =>
    E.gen(function* () {
      const token = yield* createCapabilityToken({ capabilityId, secret });
      const result = yield* verifyCapabilityToken({ secret, token });

      expect(result).toStrictEqual(O.some(capabilityId));
    })
  );

  it.effect("rejects a modified capability token", ({ expect }) =>
    E.gen(function* () {
      const token = yield* createCapabilityToken({ capabilityId, secret });

      const signatureIndex = token.lastIndexOf(".") + 1;
      const signature = token.slice(signatureIndex);
      const modifiedSignature = `${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`;
      const modifiedToken = `${token.slice(0, signatureIndex)}${modifiedSignature}`;

      const result = yield* verifyCapabilityToken({
        secret,
        token: modifiedToken,
      });

      expect(result).toBe(O.none());
    })
  );
});
