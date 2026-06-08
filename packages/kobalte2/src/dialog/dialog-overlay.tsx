import { callHandler, mergeRefs } from "@ec/kobalte2/utils";
import { combineStyle } from "@ec/solid-primitives2/props";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit, Show, useContext } from "solid-js";
import { type ElementOf, Polymorphic, type PolymorphicProps } from "../polymorphic";
import { DialogContext } from "./dialog-context";

// OVERLAY ---------------------------------------------------------------------------------------------------------------------------------
export function DialogOverlay<T extends ValidComponent = "div">(_: PolymorphicProps<T, DialogOverlayProps<T>>) {
  const context = useContext(DialogContext);

  const rest = omit(_ as DialogOverlayProps, "ref", "style", "onPointerDown");

  const onPointerDown: JSX.EventHandlerUnion<HTMLElement, PointerEvent> = (e) => {
    callHandler(e, _.onPointerDown);

    // fixes a firefox issue that starts text selection https://bugzilla.mozilla.org/show_bug.cgi?id=1675846
    if (e.target === e.currentTarget) e.preventDefault();
  };

  return (
    <Show when={context.overlayPresent()}>
      <Polymorphic<DialogOverlayRenderProps>
        as="div"
        data-closed={context.isOpen() ? undefined : ""}
        data-expanded={context.isOpen() ? "" : undefined}
        onPointerDown={onPointerDown}
        ref={mergeRefs(context.setOverlayRef, _.ref)}
        // We re-enable pointer-events prevented by `Dialog.Content` to allow scrolling.
        style={combineStyle({ "pointer-events": "auto" }, _.style)}
        {...rest}
      />
    </Show>
  );
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DialogOverlayOptions = Record<never, never>;

export type DialogOverlayCommonProps<T extends HTMLElement = HTMLElement> = {
  onPointerDown: JSX.EventHandlerUnion<T, PointerEvent>;
  ref: T | ((el: T) => void);
  style: JSX.CSSProperties | string;
};

export interface DialogOverlayRenderProps extends DialogOverlayCommonProps {
  "data-closed": string | undefined;
  "data-expanded": string | undefined;
}

export type DialogOverlayProps<T extends ValidComponent | HTMLElement = HTMLElement> = DialogOverlayOptions &
  Partial<DialogOverlayCommonProps<ElementOf<T>>>;
