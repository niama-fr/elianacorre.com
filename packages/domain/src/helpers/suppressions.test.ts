import { describe, expect, it } from "vitest";

import { hashCanonicalEmail } from "./suppressions";

describe("suppression email hashes", () => {
  it("creates a stable keyed lookup without exposing the email", async () => {
    const first = await hashCanonicalEmail({ email: "reader@example.com", secret: "suppression-secret" });
    const second = await hashCanonicalEmail({ email: "reader@example.com", secret: "suppression-secret" });

    expect(first).toBe(second);
    expect(first).not.toContain("reader@example.com");
  });

  it("changes when the environment secret changes", async () => {
    const first = await hashCanonicalEmail({ email: "reader@example.com", secret: "first-secret" });
    const second = await hashCanonicalEmail({ email: "reader@example.com", secret: "second-secret" });

    expect(first).not.toBe(second);
  });
});
