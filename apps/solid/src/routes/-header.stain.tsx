import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";
import { createStore } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const STAIN = cva(`pointer-events-none absolute top-0 left-0 rounded-full bg-accent transition-none
                          ease-in-out motion-reduce:transition-none duration-300`);

const DEFAULT_ORIGIN = { offsetHeight: 40, offsetLeft: 0, offsetTop: 10, offsetWidth: 0 };

const styleFrom = (el: HTMLElement | undefined) => {
  const { offsetHeight, offsetLeft, offsetTop, offsetWidth } = el ?? DEFAULT_ORIGIN;
  return `height:${offsetHeight}px;transform:translate(${offsetLeft}px,${offsetTop}px);width:${offsetWidth}px;`;
};

// STORE -----------------------------------------------------------------------------------------------------------------------------------
export const createStain = () => {
  let origin: HTMLElement | undefined;

  const [store, setStore] = createStore<StainState>({});

  const setOrigin = (el?: HTMLElement) => {
    origin = el;

    setStore((s) => {
      s.className = cn(el?.dataset.stain, "opacity-0 transition-none");
      s.style = styleFrom(el);
    });
  };

  const update = (el?: HTMLElement) => {
    setStore((s) => {
      s.className = cn(el?.dataset.stain, el ? "opacity-100" : "opacity-0", "transition-[background-color,height,opacity,transform,width]");
      s.style = styleFrom(el ?? origin);
    });
  };

  return { setOrigin, store, update };
};

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export function Stain(_: StainProps) {
  return <div aria-hidden="true" class={cn(STAIN(), _.stain.store.className)} style={_.stain.store.style} />;
}
type StainProps = { stain: ReturnType<typeof createStain> };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type StainState = { className?: string; style?: string };
