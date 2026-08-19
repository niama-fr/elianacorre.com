import { Clock, Duration, Effect as E } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runQuery } from "./runtime";

describe("query runtime clock", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not read real time for incidental logging, spans, or elapsed timing", async () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(42);

    const { elapsed, reads, unsafeTimes } = await runQuery(
      undefined,
      E.gen(function* () {
        const before = dateNow.mock.calls.length;
        const observedUnsafeTimes = yield* Clock.clockWith((clock) =>
          E.succeed([clock.currentTimeMillisUnsafe(), clock.currentTimeNanosUnsafe(), clock.monotonicTimeNanosUnsafe()] as const)
        );
        const [observedElapsed] = yield* E.void.pipe(E.withSpan("cache-safe-span"), E.timed);
        return { elapsed: observedElapsed, reads: dateNow.mock.calls.length - before, unsafeTimes: observedUnsafeTimes };
      })
    );

    expect(reads).toBe(0);
    expect(Duration.toMillis(elapsed)).toBe(0);
    expect(unsafeTimes).toStrictEqual([0, 0n, 0n]);
  });

  it("keeps an explicit effectful Clock read as an honest cache opt-out", async () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(42);

    await expect(runQuery(undefined, Clock.currentTimeMillis)).resolves.toBe(42);
    expect(dateNow).toHaveBeenCalledOnce();
  });
});
