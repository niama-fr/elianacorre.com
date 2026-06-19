import { callHandler, mergeRefs } from "@ec/kobalte2/utils";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Component, omit, useContext } from "solid-js";
import { Button, type ButtonRootCommonProps, type ButtonRootRenderProps } from "../button";
import type { ElementOf, PolymorphicProps } from "../polymorphic";
import { DialogContext } from "./dialog-context";

// TRIGGER ---------------------------------------------------------------------------------------------------------------------------------
export function DialogTrigger<T extends ValidComponent = "button">(_: PolymorphicProps<T, DialogTriggerProps<T>>) {
  const context = useContext(DialogContext);

  const rest = omit(_ as DialogTriggerProps, "ref", "onClick");

  const onClick: JSX.EventHandlerUnion<HTMLElement, MouseEvent> = (e) => {
    callHandler(e, _.onClick);
    context.toggle();
  };

  return (
    <Button<Component<Omit<DialogTriggerRenderProps, keyof ButtonRootRenderProps>>>
      aria-controls={context.isOpen() ? context.contentId() : undefined}
      aria-expanded={context.isOpen()}
      aria-haspopup="dialog"
      data-closed={context.isOpen() ? undefined : ""}
      data-expanded={context.isOpen() ? "" : undefined}
      onClick={onClick}
      ref={mergeRefs(context.setTriggerRef, _.ref)}
      {...rest}
    />
  );
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DialogTriggerOptions = Record<never, never>;

export interface DialogTriggerCommonProps<T extends HTMLElement = HTMLElement> extends ButtonRootCommonProps<T> {
  onClick: JSX.EventHandlerUnion<T, MouseEvent>;
}

export interface DialogTriggerRenderProps extends DialogTriggerCommonProps, ButtonRootRenderProps {
  "aria-controls": string | undefined;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  "data-closed": string | undefined;
  "data-expanded": string | undefined;
}

export type DialogTriggerProps<T extends ValidComponent | HTMLElement = HTMLElement> = DialogTriggerOptions &
  Partial<DialogTriggerCommonProps<ElementOf<T>>>;
