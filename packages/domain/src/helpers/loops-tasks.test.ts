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
      { category: "network", code: "LOOPS_REQUEST_FAILED", retryable: true, status: null },
      { category: "rateLimited", code: "LOOPS_REQUEST_FAILED", retryable: true, status: 429 },
      { category: "server", code: "LOOPS_REQUEST_FAILED", retryable: true, status: 503 },
      { category: "authentication", code: "LOOPS_REQUEST_FAILED", retryable: false, status: 401 },
      { category: "missingResource", code: "LOOPS_REQUEST_FAILED", retryable: false, status: 404 },
      { category: "validation", code: "LOOPS_REQUEST_FAILED", retryable: false, status: 400 },
    ]);
  });

  it("does not infer retryability from message text", () => {
    expect(getLoopsTaskFailure(new Error("Loops service error. Please try again later."))).toStrictEqual({
      category: "unknown",
      code: "UNSTRUCTURED_LOOPS_FAILURE",
      retryable: false,
      status: null,
    });
  });

  it("classifies blocked contact operations as permanent environment-isolation failures", () => {
    expect(getLoopsTaskFailure(new ConvexError({ code: "EMAIL_CONTACT_OPERATION_NOT_ALLOWED" }))).toStrictEqual({
      category: "environmentIsolation",
      code: "EMAIL_CONTACT_OPERATION_NOT_ALLOWED",
      retryable: false,
      status: null,
    });
  });
});
