/* oxlint-disable typescript/promise-function-async, unicorn/no-useless-undefined -- Runtime functions return Confect's existing Promise without redundant async wrappers; Effect.callback requires an explicit success value while the Clock sleep contract is void-like. */
import { RegisteredFunction } from "@confect/server";
import { Clock, Duration, Effect as E, type Schema as S } from "effect";
import { MixedScheduler } from "effect/Scheduler";

/**
 * Convex stops caching a query after it observes real time. Effect logging,
 * spans, metrics, and `Effect.timed` use the Clock's unsafe accessors, so the
 * live Effect Clock would silently make otherwise deterministic queries
 * uncacheable. Confect v10 applies the same policy inside its private complete
 * registration implementation, but does not expose that Clock publicly.
 *
 * Incidental timing therefore sees a stable zero clock. Explicit effectful
 * Clock reads and raw `Date.now()` still observe real time and honestly opt the
 * query out of caching. `sleep` remains functional without recursively using
 * the ambient Clock.
 */
const queryClock: Clock.Clock = {
  currentTimeMillis: E.sync(() => Date.now()),
  currentTimeMillisUnsafe: () => 0,
  currentTimeNanos: E.sync(() => BigInt(Date.now()) * 1_000_000n),
  currentTimeNanosUnsafe: () => 0n,
  monotonicTimeNanos: E.sync(() => BigInt(Date.now()) * 1_000_000n),
  monotonicTimeNanosUnsafe: () => 0n,
  sleep: (duration) =>
    E.callback<undefined>((resume) => {
      const handle = setTimeout(() => {
        resume(E.succeed(undefined));
      }, Duration.toMillis(duration));
      return E.sync(() => {
        clearTimeout(handle);
      });
    }),
};

type ErrorSchema = S.Codec<unknown, unknown> | undefined;

const run = <A, Error>(error: ErrorSchema, effect: E.Effect<A, Error>): Promise<A> =>
  RegisteredFunction.runHandlerPromise(error, { scheduler: new MixedScheduler("sync") })(effect);

export const runQuery = <A, Error>(error: ErrorSchema, effect: E.Effect<A, Error>): Promise<A> =>
  run(error, E.provideService(effect, Clock.Clock, queryClock));

export const runMutation = <A, Error>(error: ErrorSchema, effect: E.Effect<A, Error>): Promise<A> => run(error, effect);
