import { splitProps } from "@ec/kobalte2/utils/solid-compat";
import type { JSX, ValidComponent } from "@solidjs/web";
/*
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/810579b671791f1593108f62cdc1893de3a220e3/packages/@react-aria/overlays/src/useOverlayTrigger.ts
 */

import { callHandler, mergeRefs } from "@ec/kobalte2/utils";
import { type Component } from "solid-js";

import * as Button from "../button";
import type { ElementOf, PolymorphicProps } from "../polymorphic";
import { type PopoverDataSet, usePopoverContext } from "./popover-context";

export interface PopoverTriggerOptions {}

export interface PopoverTriggerCommonProps<T extends HTMLElement = HTMLElement> {
  onClick: JSX.EventHandlerUnion<T, MouseEvent>;
  onPointerDown: JSX.EventHandlerUnion<T, PointerEvent>;
  ref: T | ((el: T) => void);
}

export interface PopoverTriggerRenderProps extends PopoverTriggerCommonProps, Button.ButtonRootRenderProps, PopoverDataSet {
  "aria-controls": string | undefined;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
}

export type PopoverTriggerProps<T extends ValidComponent | HTMLElement = HTMLElement> = PopoverTriggerOptions &
  Partial<PopoverTriggerCommonProps<ElementOf<T>>>;

/**
 * The button that opens the popover.
 */
export function PopoverTrigger<T extends ValidComponent = "button">(props: PolymorphicProps<T, PopoverTriggerProps<T>>) {
  const context = usePopoverContext();

  const [local, others] = splitProps(props as PopoverTriggerProps, ["ref", "onClick", "onPointerDown"]);

  const onPointerDown: JSX.EventHandlerUnion<HTMLElement, PointerEvent> = (e) => {
    callHandler(e, local.onPointerDown);

    // Prevent popover from opening then closing immediately when inside an overlay in safari.
    e.preventDefault();
  };

  const onClick: JSX.EventHandlerUnion<HTMLElement, MouseEvent> = (e) => {
    callHandler(e, local.onClick);
    context.toggle();
  };

  return (
    <Button.Root<Component<Omit<PopoverTriggerRenderProps, keyof Button.ButtonRootRenderProps>>>
      aria-controls={context.isOpen() ? context.contentId() : undefined}
      aria-expanded={context.isOpen()}
      aria-haspopup="dialog"
      onClick={onClick}
      onPointerDown={onPointerDown}
      ref={mergeRefs(context.setTriggerRef, local.ref)}
      {...context.dataset()}
      {...others}
    />
  );
}
