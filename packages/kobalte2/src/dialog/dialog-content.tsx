import { contains, focusWithoutScrolling, mergeRefs } from "@ec/kobalte2/utils";
import createPreventScroll from "@ec/solid-prevent-scroll2";
import type { ValidComponent } from "@solidjs/web";
import { type Component, createEffect, merge, omit, Show, useContext } from "solid-js";
import { DismissableLayer, type DismissableLayerCommonProps, type DismissableLayerRenderProps } from "../dismissable-layer";
import type { ElementOf, PolymorphicProps } from "../polymorphic";
import {
  createFocusScope,
  createHideOutside,
  type FocusOutsideEvent,
  type InteractOutsideEvent,
  type PointerDownOutsideEvent,
} from "../primitives";
import { DialogContext } from "./dialog-context";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function DialogContent<T extends ValidComponent = "div">(props: PolymorphicProps<T, DialogContentProps<T>>) {
  let ref: HTMLElement | undefined;

  const context = useContext(DialogContext);

  const _ = merge({ id: context.generateId("content") }, props as DialogContentProps);
  const rest = omit(_, "ref", "onOpenAutoFocus", "onCloseAutoFocus", "onPointerDownOutside", "onFocusOutside", "onInteractOutside");

  let hasInteractedOutside = false;
  let hasPointerDownOutside = false;

  const onPointerDownOutside = (e: PointerDownOutsideEvent) => {
    _.onPointerDownOutside?.(e);
    if (context.modal() && e.detail.isContextMenu) e.preventDefault();
  };

  const onFocusOutside = (e: FocusOutsideEvent) => {
    _.onFocusOutside?.(e);
    if (context.modal()) e.preventDefault();
  };

  const onInteractOutside = (e: InteractOutsideEvent) => {
    _.onInteractOutside?.(e);
    if (context.modal()) return;

    if (!e.defaultPrevented) {
      hasInteractedOutside = true;
      if (e.detail.originalEvent.type === "pointerdown") hasPointerDownOutside = true;
    }

    if (contains(context.triggerRef(), e.target as HTMLElement)) e.preventDefault();
    if (e.detail.originalEvent.type === "focusin" && hasPointerDownOutside) e.preventDefault();
  };

  const onCloseAutoFocus = (e: Event) => {
    _.onCloseAutoFocus?.(e);

    if (context.modal()) {
      e.preventDefault();
      focusWithoutScrolling(context.triggerRef());
    } else {
      if (!e.defaultPrevented) {
        if (!hasInteractedOutside) focusWithoutScrolling(context.triggerRef());
        e.preventDefault();
      }

      hasInteractedOutside = false;
      hasPointerDownOutside = false;
    }
  };

  // aria-hide everything except the content (better supported equivalent to setting aria-modal)
  createHideOutside({
    isDisabled: () => !(context.isOpen() && context.modal()),
    targets: () => (ref ? [ref] : []),
  });

  createPreventScroll({
    element: () => ref ?? null,
    enabled: () => context.contentPresent() && context.preventScroll(),
  });

  createFocusScope(
    {
      trapFocus: () => context.isOpen() && context.modal(),
      onMountAutoFocus: _.onOpenAutoFocus,
      onUnmountAutoFocus: onCloseAutoFocus,
    },
    () => ref
  );

  createEffect(
    () => undefined,
    () => () => context.registerContentId(rest.id)
  );

  return (
    <Show when={context.contentPresent()}>
      <DismissableLayer<Component<Omit<DialogContentRenderProps, keyof DismissableLayerRenderProps>>>
        aria-describedby={context.descriptionId()}
        aria-labelledby={context.titleId()}
        data-closed={context.isOpen() ? undefined : ""}
        data-expanded={context.isOpen() ? "" : undefined}
        disableOutsidePointerEvents={context.modal() && context.isOpen()}
        excludedElements={[context.triggerRef]}
        onDismiss={context.close}
        onFocusOutside={onFocusOutside}
        onInteractOutside={onInteractOutside}
        onPointerDownOutside={onPointerDownOutside}
        ref={mergeRefs((el) => {
          context.setContentRef(el);
          ref = el;
        }, _.ref)}
        role="dialog"
        tabIndex={-1}
        {...rest}
      />
    </Show>
  );
}
export type DialogContentProps<T extends ValidComponent | HTMLElement = HTMLElement> = DialogContentOptions &
  Partial<DialogContentCommonProps<ElementOf<T>>>;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DialogContentOptions = {
  /**
   * Event handler called when focus moves to the trigger after closing.
   * It can be prevented by calling `event.preventDefault`.
   */
  onCloseAutoFocus?: (event: Event) => void;

  /**
   * Event handler called when the escape key is down.
   * It can be prevented by calling `event.preventDefault`.
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;

  /**
   * Event handler called when the focus moves outside the bounds of the component.
   * It can be prevented by calling `event.preventDefault`.
   */
  onFocusOutside?: (event: FocusOutsideEvent) => void;

  /**
   * Event handler called when an interaction (pointer or focus event) happens outside the bounds of the component.
   * It can be prevented by calling `event.preventDefault`.
   */
  onInteractOutside?: (event: InteractOutsideEvent) => void;
  /**
   * Event handler called when focus moves into the component after opening.
   * It can be prevented by calling `event.preventDefault`.
   */
  onOpenAutoFocus?: (event: Event) => void;

  /**
   * Event handler called when a pointer event occurs outside the bounds of the component.
   * It can be prevented by calling `event.preventDefault`.
   */
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void;
};

export interface DialogContentCommonProps<T extends HTMLElement = HTMLElement> extends DismissableLayerCommonProps<T> {
  id: string;
}

export interface DialogContentRenderProps extends DialogContentCommonProps, DismissableLayerRenderProps {
  role: "dialog" | "alertdialog";
  tabIndex: -1;
}
