import { describe, expect, it } from "vitest";

import { createCapabilityToken, verifyCapabilityToken } from "./utils";

describe("capability tokens", () => {
  it("verifies a signed capability identifier without persisting a bearer token", async () => {
    const token = await createCapabilityToken({ capabilityId: "j57a8f9d2e3", secret: "test-capability-secret" });

    await expect(verifyCapabilityToken({ secret: "test-capability-secret", token })).resolves.toBe("j57a8f9d2e3");
  });

  it("rejects a modified capability token", async () => {
    const token = await createCapabilityToken({ capabilityId: "j57a8f9d2e3", secret: "test-capability-secret" });

    await expect(verifyCapabilityToken({ secret: "test-capability-secret", token: `${token}x` })).resolves.toBeNull();
  });
});
