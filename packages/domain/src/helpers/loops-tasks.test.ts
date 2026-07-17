import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { classifyLoopsTaskFailure, getLoopsTaskRetryPolicy, isLoopsTaskRetryable } from "./loops-tasks";

const classifyFailure = (failure: string) => classifyLoopsTaskFailure(new ConvexError({ code: "LOOPS_REQUEST_FAILED", failure }));

describe("Loops task retry policy", () => {
  it("uses the production attempt windows agreed for each delivery task", () => {
    expect({
      confirmation: getLoopsTaskRetryPolicy("sendConfirmationEmail"),
      contactDeletion: getLoopsTaskRetryPolicy("deleteContact"),
      contactSync: getLoopsTaskRetryPolicy("syncContact"),
      ebook: getLoopsTaskRetryPolicy("sendEbookEmail"),
    }).toStrictEqual({
      confirmation: { base: 2, initialBackoffMs: 30_000, maxAttempts: 12 },
      contactDeletion: { base: 2, initialBackoffMs: 60_000, maxAttempts: 10 },
      contactSync: { base: 2, initialBackoffMs: 60_000, maxAttempts: 10 },
      ebook: { base: 2, initialBackoffMs: 30_000, maxAttempts: 14 },
    });
  });
});

describe("Loops task failure classification", () => {
  it("retries only network, rate-limit, and server failures from structured provider data", () => {
    expect([
      classifyFailure("network"),
      classifyFailure("rateLimited"),
      classifyFailure("server"),
      classifyFailure("authentication"),
      classifyFailure("missingResource"),
      classifyFailure("validation"),
    ]).toStrictEqual(["network", "rateLimited", "server", "authentication", "missingResource", "validation"]);
  });

  it("does not infer retryability from message text", () => {
    expect(classifyLoopsTaskFailure(new Error("Loops service error. Please try again later."))).toBe("unknown");
  });

  it("retries only transient Loops failures", () => {
    expect({
      authentication: isLoopsTaskRetryable("authentication"),
      missingResource: isLoopsTaskRetryable("missingResource"),
      network: isLoopsTaskRetryable("network"),
      rateLimited: isLoopsTaskRetryable("rateLimited"),
      server: isLoopsTaskRetryable("server"),
      unknown: isLoopsTaskRetryable("unknown"),
      validation: isLoopsTaskRetryable("validation"),
    }).toStrictEqual({
      authentication: false,
      missingResource: false,
      network: true,
      rateLimited: true,
      server: true,
      unknown: false,
      validation: false,
    });
  });
});
