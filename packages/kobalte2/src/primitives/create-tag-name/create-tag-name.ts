import { isString } from "@ec/kobalte2/utils";
import { type Accessor, type Component, createEffect, createSignal } from "solid-js";

/**
 * Returns the tag name by parsing an element ref.
 * @example
 * function Component(props) {
 *   let ref: HTMLDivElement | undefined;
 *   const tagName = createTagName(() => ref, () => "button"); // div
 *   return <div ref={ref} {...props} />;
 * }
 */
export function createTagName(ref: Accessor<HTMLElement | undefined>, fallback?: Accessor<string | Component | undefined>) {
  const [tagName, setTagName] = createSignal(stringOrUndefined(fallback?.()), {
    ownedWrite: true,
  });

  createEffect(
    () => [fallback?.(), ref()] as const,
    ([fallback, ref]) => {
      setTagName(ref?.tagName.toLowerCase() ?? stringOrUndefined(fallback));
    }
  );

  return tagName;
}

function stringOrUndefined(value: unknown) {
  return isString(value) ? value : undefined;
}
