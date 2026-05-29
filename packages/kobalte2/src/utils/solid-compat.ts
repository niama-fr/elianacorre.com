import { createEffect as solidCreateEffect, createRenderEffect as solidCreateRenderEffect, merge, omit, onSettled, untrack } from "solid-js";
import type { Accessor, ComputeFunction, EffectFunction, EffectOptions, NoInfer } from "solid-js";

type PropertyKeyOf<T> = Extract<keyof T, PropertyKey>;

export const mergeProps = merge;
export const onMount = onSettled;
export const batch = <T>(fn: () => T): T => fn();

export type AccessorArray<S> = readonly Accessor<any>[];

export function on<S, Next extends Prev, Prev = Next>(
	deps: AccessorArray<S> | Accessor<S>,
	fn: (input: any, prevInput: any, prev: any) => Next,
	options: { defer?: boolean } = {},
): ComputeFunction<undefined | NoInfer<Next>, NoInfer<Next> | undefined> {
	const isArray = Array.isArray(deps);
	let prevInput: S | undefined;
	let initialized = false;

	return (prevValue) => {
		const input = (
			isArray ? deps.map((dependency) => dependency()) : (deps as Accessor<S>)()
		) as S;

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
	options?: EffectOptions,
) {
	return solidCreateEffect(compute, effect ?? (() => undefined), options);
}

export const createRenderEffect: typeof createEffect = (compute, effect, options) =>
	solidCreateRenderEffect(compute, effect ?? (() => undefined), options);

export const createComputed = createEffect;

export function splitProps<T extends object, K1 extends readonly PropertyKeyOf<T>[]>(
	props: T,
	keys: K1,
): [Pick<T, K1[number]>, Omit<T, K1[number]>];
export function splitProps<
	T extends object,
	K1 extends readonly PropertyKeyOf<T>[],
	K2 extends readonly PropertyKeyOf<T>[],
>(
	props: T,
	keys: K1,
	keys2: K2,
): [Pick<T, K1[number]>, Pick<T, K2[number]>, Omit<T, K1[number] | K2[number]>];
export function splitProps<T extends object>(
	props: T,
	...keyGroups: readonly (readonly PropertyKeyOf<T>[])[]
) {
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

	return [...groups, omit(props, [...splitKeys] as never)] as const;
}
