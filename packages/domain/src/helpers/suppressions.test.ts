import { describe, it } from "@effect/vitest";
import { Effect as E } from "effect";

import { hashCanonicalEmail } from "./suppressions";

const email = "reader@example.com";
const hash = (secret: string) => hashCanonicalEmail({ email, secret });

describe("suppression email hashes", () => {
  it.effect("creates a stable keyed lookup without exposing the email", ({ expect }) =>
    E.gen(function* () {
      const [first, second] = yield* E.all([hash("suppression-secret"), hash("suppression-secret")]);

      expect(first).toBe(second);
      expect(first).not.toContain(email);
    })
  );

  it.effect("changes when the environment secret changes", ({ expect }) =>
    E.gen(function* () {
      const [first, second] = yield* E.all([hash("first-secret"), hash("second-secret")]);

      expect(first).not.toBe(second);
    })
  );
});
