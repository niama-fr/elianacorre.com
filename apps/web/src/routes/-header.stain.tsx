import { cn } from "@ec/ui/lib/utils";
import { createStore, useSelector } from "@tanstack/react-store";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const STAIN = cva(`STAIN pointer-events-none absolute top-0 left-0 rounded-full bg-accent transition-none
                          ease-in-out motion-reduce:transition-none duration-300`);

const DEFAULT_ORIGIN = { offsetHeight: 40, offsetLeft: 0, offsetTop: 10, offsetWidth: 0 };

const styleFrom = (el: HTMLElement | undefined) => {
  const { offsetHeight: height, offsetLeft, offsetTop, offsetWidth: width } = el ?? DEFAULT_ORIGIN;
  return { height, transform: `translate(${offsetLeft}px,${offsetTop}px)`, width };
};

// STORE -----------------------------------------------------------------------------------------------------------------------------------
export const createStain = () => {
  let origin: HTMLElement | undefined;

  return createStore<StainState, StainActions>({}, ({ setState }) => ({
    setOrigin: (el?: HTMLElement) => {
      origin = el;
      setState(() => ({
        className: cn(el?.dataset.stain, "opacity-0 transition-none"),
        style: styleFrom(el),
      }));
    },
    update: (el?: HTMLElement) => {
      setState(() => ({
        className: cn(el?.dataset.stain, el ? "opacity-100" : "opacity-0", "transition-[background-color,height,opacity,transform,width]"),
        style: styleFrom(el ?? origin),
      }));
    },
  }));
};

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export function Stain(props: StainProps) {
  const { stain } = props;
  const className = useSelector(stain, (s) => s.className);
  const style = useSelector(stain, (s) => s.style);
  return <div aria-hidden="true" className={cn(STAIN(), className)} style={style} />;
}
type StainProps = { stain: ReturnType<typeof createStain> };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type StainState = { className?: string; style?: React.CSSProperties };
export type StainActions = { setOrigin: (el?: HTMLElement) => void; update: (el?: HTMLElement) => void };
