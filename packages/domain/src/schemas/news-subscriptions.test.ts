import { describe, it } from "@effect/vitest";
import { Effect as E, Schema as S } from "effect";

import { sNewsSubscriptionUpsert } from "./news-subscriptions";

const decodeUpsert = S.decodeUnknownEffect(sNewsSubscriptionUpsert);

describe("newsletter subscription", () => {
  it.effect("accepts an empty honeypot field in the server payload", ({ expect }) =>
    E.gen(function* () {
      const result = yield* decodeUpsert({
        consent: true,
        email: "eliana@example.com",
        firstName: "",
        privacyNoticeId: "k170e5dj9c8heby7eah6c4mr6h7a7tw3",
        website: "",
      });

      expect(result).toMatchObject({
        firstName: undefined,
        website: "",
      });
    })
  );

  it.effect("trims the honeypot field in the server payload", ({ expect }) =>
    E.gen(function* () {
      const result = yield* decodeUpsert({
        consent: true,
        email: "eliana@example.com",
        firstName: "Eliana",
        privacyNoticeId: "k170e5dj9c8heby7eah6c4mr6h7a7tw3",
        website: "  trap  ",
      });

      expect(result).toMatchObject({
        website: "trap",
      });
    })
  );
});
