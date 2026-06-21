import { mergeRefs } from "@ec/kobalte2/utils";
import { splitProps } from "@ec/kobalte2/utils/solid-compat";
import { combineStyle } from "@ec/solid-primitives2/props";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type ElementOf, Polymorphic, type PolymorphicProps } from "../polymorphic";
import { usePopperContext } from "./popper-context";

export interface PopperPositionerOptions {}

export interface PopperPositionerCommonProps<T extends HTMLElement = HTMLElement> {
  ref: T | ((el: T) => void);
  style?: JSX.CSSProperties | string;
}

export interface PopperPositionerRenderProps extends PopperPositionerCommonProps {
  "data-popper-positioner": "";
}

export type PopperPositionerProps<T extends ValidComponent | HTMLElement = HTMLElement> = PopperPositionerOptions &
  Partial<PopperPositionerCommonProps<ElementOf<T>>>;

/**
 * The wrapper component that positions the popper content relative to the popper anchor.
 */
export function PopperPositioner<T extends ValidComponent = "div">(props: PolymorphicProps<T, PopperPositionerProps<T>>) {
  const context = usePopperContext();

  const [local, others] = splitProps(props as PopperPositionerProps, ["ref", "style"]);

  return (
    <Polymorphic<PopperPositionerRenderProps>
      as="div"
      data-popper-positioner=""
      ref={mergeRefs(context.setPositionerRef, local.ref)}
      style={combineStyle(
        {
          position: "absolute",
          top: 0,
          left: 0,
          "min-width": "max-content",
        },
        local.style
      )}
      {...others}
    />
  );
}
