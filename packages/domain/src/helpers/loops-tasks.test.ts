import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { getLoopsTaskFailure, getLoopsTaskRetryPolicy } from "./loops-tasks";

const failure = (category: string, status: number | null) =>
  getLoopsTaskFailure(new ConvexError({ category, code: "LOOPS_REQUEST_FAILED", status }));

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
      failure("network", null),
      failure("rateLimited", 429),
      failure("server", 503),
      failure("authentication", 401),
      failure("missingResource", 404),
      failure("validation", 400),
    ]).toStrictEqual([
      { failure: "network", retryable: true },
      { failure: "rateLimited", retryable: true },
      { failure: "server", retryable: true },
      { failure: "authentication", retryable: false },
      { failure: "missingResource", retryable: false },
      { failure: "validation", retryable: false },
    ]);
  });

  it("does not infer retryability from message text", () => {
    expect(getLoopsTaskFailure(new Error("Loops service error. Please try again later."))).toStrictEqual({
      failure: "unknown",
      retryable: false,
    });
  });
});
