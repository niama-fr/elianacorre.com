import type { Accessor, ComputeFunction, EffectFunction, EffectOptions, NoInfer } from "solid-js";
import {
  getOwner,
  merge,
  omit,
  onCleanup,
  onSettled,
  runWithOwner,
  createEffect as solidCreateEffect,
  createRenderEffect as solidCreateRenderEffect,
  untrack,
} from "solid-js";

type PropertyKeyOf<T> = Extract<keyof T, PropertyKey>;

export const mergeProps = merge;
export const batch = <T>(fn: () => T): T => fn();

export function onMount(fn: () => undefined | VoidFunction): void {
  const owner = getOwner();
  let disposed = false;
  let cleanup: undefined | VoidFunction;

  onCleanup(() => {
    disposed = true;
    cleanup?.();
  });

  onSettled(() => {
    queueMicrotask(() => {
      if (disposed) {
        return;
      }

      cleanup = owner ? runWithOwner(owner, fn) : fn();
    });
  });
}

// biome-ignore lint/suspicious/noExplicitAny: This mirrors Solid 1's loose `on` array dependency typing for Kobalte compatibility.
export type AccessorArray<_S> = readonly Accessor<any>[];

export function on<S, Next extends Prev, Prev = Next>(
  deps: AccessorArray<S> | Accessor<S>,
  // biome-ignore lint/suspicious/noExplicitAny: Kobalte call sites rely on Solid 1's permissive callback inference here.
  fn: (input: any, prevInput: any, prev: any) => Next,
  options: { defer?: boolean } = {}
): ComputeFunction<undefined | NoInfer<Next>, NoInfer<Next> | undefined> {
  const isArray = Array.isArray(deps);
  let prevInput: S | undefined;
  let initialized = false;

  return (prevValue) => {
    const input = (isArray ? deps.map((dependency) => dependency()) : (deps as Accessor<S>)()) as S;

    if (options.defer && !initialized) {
      initialized = true;
      prevInput = input;
      return prevValue as NoInfer<Next> | undefined;
    }

    const result = untrack(() => fn(input, prevInput, prevValue));
    initialized = true;
    prevInput = input;
    return result;
  };
}

export function createEffect<T>(
  compute: ComputeFunction<undefined | NoInfer<T>, T>,
  effect?: EffectFunction<NoInfer<T>, T>,
  options?: EffectOptions
) {
  return solidCreateEffect(compute, effect ?? (() => undefined), options);
}

export const createRenderEffect: typeof createEffect = (compute, effect, options) =>
  solidCreateRenderEffect(compute, effect ?? (() => undefined), options);

export const createComputed = createEffect;

export function splitProps<T extends object, K1 extends readonly PropertyKeyOf<T>[]>(
  props: T,
  keys: K1
): [Pick<T, K1[number]>, Omit<T, K1[number]>];
export function splitProps<T extends object, K1 extends readonly PropertyKeyOf<T>[], K2 extends readonly PropertyKeyOf<T>[]>(
  props: T,
  keys: K1,
  keys2: K2
): [Pick<T, K1[number]>, Pick<T, K2[number]>, Omit<T, K1[number] | K2[number]>];
export function splitProps<T extends object>(props: T, ...keyGroups: readonly (readonly PropertyKeyOf<T>[])[]) {
  const splitKeys = new Set<PropertyKeyOf<T>>();
  const groups = keyGroups.map((keys) => {
    const group: Record<PropertyKey, unknown> = {};

    for (const key of keys) {
      splitKeys.add(key);
      Object.defineProperty(group, key, {
        enumerable: true,
        get: () => props[key],
      });
    }

    return group;
  });

  return [...groups, omit(props, ...([...splitKeys] as never[]))] as const;
}
