import { callHandler } from "@ec/kobalte2/utils";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Component, omit, useContext } from "solid-js";
import { Button, type ButtonRootCommonProps, type ButtonRootOptions, type ButtonRootRenderProps } from "../button";
import type { ElementOf, PolymorphicProps } from "../polymorphic";
import { DialogContext } from "./dialog-context";

// CLOSE BUTTON ----------------------------------------------------------------------------------------------------------------------------
export function DialogCloseButton<T extends ValidComponent = "button">(_: PolymorphicProps<T, DialogCloseButtonProps<T>>) {
  const rest = omit(_ as DialogCloseButtonProps, "aria-label", "onClick");

  const context = useContext(DialogContext);

  const onClick: JSX.EventHandlerUnion<HTMLElement, MouseEvent> = (e) => {
    callHandler(e, _.onClick);
    context.close();
  };

  return (
    <Button<Component<Omit<DialogCloseButtonRenderProps, keyof ButtonRootRenderProps>>>
      aria-label={_["aria-label"] || context.translations().dismiss}
      onClick={onClick}
      {...rest}
    />
  );
}
export type DialogCloseButtonProps<T extends ValidComponent | HTMLElement = HTMLElement> = DialogCloseButtonOptions &
  Partial<DialogCloseButtonCommonProps<ElementOf<T>>>;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export interface DialogCloseButtonOptions extends ButtonRootOptions {}

export interface DialogCloseButtonCommonProps<T extends HTMLElement = HTMLElement> extends ButtonRootCommonProps<T> {
  "aria-label": string;
  onClick: JSX.EventHandlerUnion<T, MouseEvent>;
}

export interface DialogCloseButtonRenderProps extends DialogCloseButtonCommonProps, ButtonRootRenderProps {}
