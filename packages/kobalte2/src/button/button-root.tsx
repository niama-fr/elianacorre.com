import { mergeRefs } from "@ec/kobalte2/utils";
import type { ValidComponent } from "@solidjs/web";
import { createMemo, merge, omit } from "solid-js";
import { type ElementOf, Polymorphic, type PolymorphicProps } from "../polymorphic";
import { createTagName } from "../primitives";
import { isButton } from "./is-button";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function ButtonRoot<T extends ValidComponent = "button">(props: PolymorphicProps<T, ButtonRootProps<T>>) {
  const _ = merge({ type: "button" }, props as ButtonRootProps);
  const rest = omit(_, "ref", "type", "disabled");

  let ref: HTMLElement | undefined;

  const tagName = createTagName(
    () => ref,
    () => "button"
  );

  const isNativeButton = createMemo(() => {
    const elementTagName = tagName();
    if (elementTagName == null) return false;
    return isButton({ tagName: elementTagName, type: _.type });
  });

  const isNativeInput = createMemo(() => tagName() === "input");
  const isNativeLink = createMemo(() => tagName() === "a" && ref?.getAttribute("href") != null);

  return (
    <Polymorphic<ButtonRootRenderProps>
      aria-disabled={!(isNativeButton() || isNativeInput()) && _.disabled ? true : undefined}
      as="button"
      data-disabled={_.disabled ? "" : undefined}
      disabled={isNativeButton() || isNativeInput() ? _.disabled : undefined}
      ref={mergeRefs((el) => (ref = el), _.ref)}
      role={isNativeButton() || isNativeLink() ? undefined : "button"}
      tabIndex={isNativeButton() || isNativeLink() || _.disabled ? undefined : 0}
      type={isNativeButton() || isNativeInput() ? _.type : undefined}
      {...rest}
    />
  );
}
export type ButtonRootProps<T extends ValidComponent | HTMLElement = HTMLElement> = ButtonRootOptions &
  Partial<ButtonRootCommonProps<ElementOf<T>>>;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ButtonRootOptions = Record<never, never>;

export type ButtonRootCommonProps<T extends HTMLElement = HTMLElement> = {
  /** Whether the button is disabled. */
  disabled: boolean | undefined;
  ref: T | ((el: T) => void);
  tabIndex: number | string | undefined;
  type: string | undefined;
};

export type ButtonRootRenderProps = ButtonRootCommonProps & {
  "aria-disabled": boolean | undefined;
  "data-disabled": string | undefined;
  role: "menuitem" | "button" | undefined;
};
