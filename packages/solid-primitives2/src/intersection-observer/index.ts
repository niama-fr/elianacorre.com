import { access, type FalsyValue, handleDiffArray, type MaybeAccessor } from "@ec/solid-primitives2/utils";
import type { JSX } from "@solidjs/web";
import { isServer } from "@solidjs/web";
import { type Accessor, createEffect, createSignal, DEV, onCleanup, onSettled, type Setter, untrack } from "solid-js";

export type AddIntersectionObserverEntry = (el: Element) => void;
export type RemoveIntersectionObserverEntry = (el: Element) => void;

export type EntryCallback = (entry: IntersectionObserverEntry, instance: IntersectionObserver) => void;
export type AddViewportObserverEntry = (el: Element, callback: MaybeAccessor<EntryCallback>) => void;
export type RemoveViewportObserverEntry = (el: Element) => void;

export type CreateViewportObserverReturnValue = [
  AddViewportObserverEntry,
  {
    remove: RemoveViewportObserverEntry;
    start: () => void;
    stop: () => void;
    instance: IntersectionObserver;
  },
];

declare module "solid-js" {
  // Solid directives are augmented through the JSX namespace.
  namespace JSX {
    // Declaration merging requires an interface.
    interface Directives {
      intersectionObserver: true | EntryCallback;
    }
  }
}

export type E = JSX.Element;

function observe(el: Element, instance: IntersectionObserver): void {
  if (DEV && el instanceof HTMLElement && el.style.display === "contents") {
    console.warn(
      "[@ec/solid-primitives2/intersection-observer] IntersectionObserver is not able to observe elements with 'display: \"contents\"' style:",
      el
    );
  }
  instance.observe(el);
}

/**
 * @deprecated Please use native {@link IntersectionObserver}, or {@link createIntersectionObserver} instead.
 */
export function makeIntersectionObserver(
  elements: Element[],
  onChange: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): {
  add: AddIntersectionObserverEntry;
  remove: RemoveIntersectionObserverEntry;
  start: VoidFunction;
  reset: VoidFunction;
  stop: VoidFunction;
  instance: IntersectionObserver;
} {
  if (isServer) {
    return {
      add: () => undefined,
      remove: () => undefined,
      start: () => undefined,
      reset: () => undefined,
      stop: () => undefined,
      instance: {} as IntersectionObserver,
    };
  }

  const instance = new IntersectionObserver(onChange, options);
  const add: AddIntersectionObserverEntry = (el) => observe(el, instance);
  const remove: RemoveIntersectionObserverEntry = (el) => instance.unobserve(el);
  const start = () => {
    for (const element of elements) {
      add(element);
    }
  };
  const reset = () => {
    for (const entry of instance.takeRecords()) {
      remove(entry.target);
    }
  };
  start();
  return { add, remove, start, stop: onCleanup(() => instance.disconnect()), reset, instance };
}

/**
 * Creates a reactive Intersection Observer primitive.
 *
 * @param elements - A list of elements to watch
 * @param onChange - An event handler that returns an array of observer entries
 * @param options - IntersectionObserver constructor options
 */
export function createIntersectionObserver(
  elements: Accessor<Element[]>,
  onChange: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): void {
  if (isServer) {
    return;
  }

  const io = new IntersectionObserver(onChange, options);
  onCleanup(() => io.disconnect());
  let prevList: Element[] = [];

  createEffect(
    () => elements(),
    (list) => {
      handleDiffArray(
        list,
        prevList,
        (el) => observe(el, io),
        (el) => io.unobserve(el)
      );
      prevList = list;
    }
  );
}

/**
 * Creates a more advanced viewport observer for complex tracking with multiple objects in a single IntersectionObserver instance.
 *
 * @param elements - A list of elements to watch
 * @param callback - Element intersection change event handler
 * @param options - IntersectionObserver constructor options
 */
export function createViewportObserver(
  elements: MaybeAccessor<Element[]>,
  callback: EntryCallback,
  options?: IntersectionObserverInit
): CreateViewportObserverReturnValue;

export function createViewportObserver(
  initial: MaybeAccessor<[Element, EntryCallback][]>,
  options?: IntersectionObserverInit
): CreateViewportObserverReturnValue;

export function createViewportObserver(options?: IntersectionObserverInit): CreateViewportObserverReturnValue;

export function createViewportObserver(
  ...args:
    | [elements: MaybeAccessor<Element[]>, callback: EntryCallback, options?: IntersectionObserverInit]
    | [initial: MaybeAccessor<[Element, EntryCallback][]>, options?: IntersectionObserverInit]
    | [options?: IntersectionObserverInit]
): CreateViewportObserverReturnValue {
  if (isServer) {
    return [
      () => undefined,
      {
        remove: () => undefined,
        start: () => undefined,
        stop: () => undefined,
        instance: {} as IntersectionObserver,
      },
    ];
  }

  let initial: [Element, EntryCallback][] = [];
  let options: IntersectionObserverInit | undefined = {};
  const [firstArg, secondArg, thirdArg] = args;

  if (Array.isArray(firstArg) || firstArg instanceof Function) {
    if (secondArg instanceof Function) {
      initial = access(firstArg as MaybeAccessor<Element[]>).map((el) => [el, secondArg]);
      options = thirdArg;
    } else {
      initial = access(firstArg as MaybeAccessor<[Element, EntryCallback][]>);
      options = secondArg;
    }
  } else {
    options = firstArg;
  }

  const callbacks = new WeakMap<Element, MaybeAccessor<EntryCallback>>();
  const onChange: IntersectionObserverCallback = (entries, instance) => {
    for (const entry of entries) {
      const callback = callbacks.get(entry.target);
      const callbackResult = callback?.(entry, instance);
      if (callbackResult instanceof Function) {
        callbackResult(entry, instance);
      }
    }
  };
  const { add, remove, stop, instance } = makeIntersectionObserver([], onChange, options);

  const addEntry: AddViewportObserverEntry = (el, callback) => {
    add(el);
    callbacks.set(el, callback);
  };
  const removeEntry: RemoveViewportObserverEntry = (el) => {
    callbacks.delete(el);
    remove(el);
  };
  const start = () => {
    for (const [el, callback] of initial) {
      addEntry(el, callback);
    }
  };
  onSettled(start);
  return [addEntry, { remove: removeEntry, start, stop, instance }];
}

export type VisibilitySetter<Ctx extends object = object> = (
  entry: IntersectionObserverEntry,
  context: Ctx & { visible: boolean }
) => boolean;

/**
 * Creates reactive signal that changes when a single element's visibility changes.
 *
 * @param options - Primitive and IntersectionObserver constructor options
 * @param setter - Optional callback for mapping intersection entries to the visible signal value
 */
export function createVisibilityObserver(
  options?: IntersectionObserverInit & {
    initialValue?: boolean;
  },
  setter?: MaybeAccessor<VisibilitySetter>
): (element: Accessor<Element | FalsyValue> | Element) => Accessor<boolean> {
  if (isServer) {
    return () => () => false;
  }

  const callbacks = new WeakMap<Element, EntryCallback>();

  const io = new IntersectionObserver((entries, instance) => {
    for (const entry of entries) {
      callbacks.get(entry.target)?.(entry, instance);
    }
  }, options);
  onCleanup(() => io.disconnect());

  function removeEntry(el: Element): void {
    io.unobserve(el);
    callbacks.delete(el);
  }
  function addEntry(el: Element, callback: EntryCallback): void {
    observe(el, io);
    callbacks.set(el, callback);
  }

  const getCallback: (get: Accessor<boolean>, set: Setter<boolean>) => EntryCallback = setter
    ? (get, set) => {
        const setterRef = access(setter);
        return (entry) => set(setterRef(entry, { visible: untrack(get) }));
      }
    : (_get, set) => (entry) => set(entry.isIntersecting);

  return (element) => {
    const [isVisible, setVisible] = createSignal(options?.initialValue ?? false);
    const callback = getCallback(isVisible, setVisible);
    let prevEl: Element | FalsyValue;

    if (element instanceof Element) {
      addEntry(element, callback);
      prevEl = element;
    } else {
      createEffect(
        () => element(),
        (el) => {
          if (el === prevEl) {
            return;
          }
          if (prevEl) {
            removeEntry(prevEl);
          }
          if (el) {
            addEntry(el, callback);
          }
          prevEl = el;
        }
      );
    }

    onCleanup(() => {
      if (prevEl) {
        removeEntry(prevEl);
      }
    });

    return isVisible;
  };
}

export const Occurrence = {
  Entering: "Entering",
  Leaving: "Leaving",
  Inside: "Inside",
  Outside: "Outside",
} as const;
export type Occurrence = (typeof Occurrence)[keyof typeof Occurrence];

/**
 * Calculates the occurrence of an element in the viewport.
 */
export function getOccurrence(isIntersecting: boolean, prevIsIntersecting: boolean | undefined): Occurrence {
  if (isServer) {
    return Occurrence.Outside;
  }
  if (isIntersecting) {
    return prevIsIntersecting ? Occurrence.Inside : Occurrence.Entering;
  }
  if (prevIsIntersecting === true) {
    return Occurrence.Leaving;
  }
  return Occurrence.Outside;
}

/**
 * A visibility setter factory function. It provides information about element occurrence in the viewport.
 */
export function withOccurrence<Ctx extends object>(
  setter: MaybeAccessor<VisibilitySetter<Ctx & { occurrence: Occurrence }>>
): () => VisibilitySetter<Ctx> {
  if (isServer) {
    return () => () => false;
  }
  return () => {
    let prevIntersecting: boolean | undefined;
    const callback = access(setter);

    return (entry, context) => {
      const { isIntersecting } = entry;
      const occurrence = getOccurrence(isIntersecting, prevIntersecting);
      prevIntersecting = isIntersecting;
      return callback(entry, { ...context, occurrence });
    };
  };
}

export const DirectionX = {
  Left: "Left",
  Right: "Right",
  None: "None",
} as const;
export type DirectionX = (typeof DirectionX)[keyof typeof DirectionX];

export const DirectionY = {
  Top: "Top",
  Bottom: "Bottom",
  None: "None",
} as const;
export type DirectionY = (typeof DirectionY)[keyof typeof DirectionY];

/**
 * Calculates the direction of an element in the viewport.
 */
export function getDirection(
  rect: DOMRectReadOnly,
  prevRect: DOMRectReadOnly | undefined,
  intersecting: boolean
): { directionX: DirectionX; directionY: DirectionY } {
  if (isServer) {
    return {
      directionX: DirectionX.None,
      directionY: DirectionY.None,
    };
  }
  let directionX: DirectionX = DirectionX.None;
  let directionY: DirectionY = DirectionY.None;
  if (!prevRect) {
    return { directionX, directionY };
  }
  if (rect.top < prevRect.top) {
    directionY = intersecting ? DirectionY.Bottom : DirectionY.Top;
  } else if (rect.top > prevRect.top) {
    directionY = intersecting ? DirectionY.Top : DirectionY.Bottom;
  }
  if (rect.left > prevRect.left) {
    directionX = intersecting ? DirectionX.Left : DirectionX.Right;
  } else if (rect.left < prevRect.left) {
    directionX = intersecting ? DirectionX.Right : DirectionX.Left;
  }
  return { directionX, directionY };
}

/**
 * A visibility setter factory function. It provides information about element direction on the screen.
 */
export function withDirection<Ctx extends object>(
  callback: MaybeAccessor<VisibilitySetter<Ctx & { directionX: DirectionX; directionY: DirectionY }>>
): () => VisibilitySetter<Ctx> {
  if (isServer) {
    return () => () => false;
  }
  return () => {
    let prevBounds: DOMRectReadOnly | undefined;
    const wrappedCallback = access(callback);

    return (entry, context) => {
      const { boundingClientRect } = entry;
      const direction = getDirection(boundingClientRect, prevBounds, entry.isIntersecting);
      prevBounds = boundingClientRect;
      return wrappedCallback(entry, { ...context, ...direction });
    };
  };
}
