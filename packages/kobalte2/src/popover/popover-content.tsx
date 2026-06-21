import { contains, focusWithoutScrolling, mergeDefaultProps, mergeRefs, OverrideComponentProps } from "@ec/kobalte2/utils";
import { createEffect, splitProps } from "@ec/kobalte2/utils/solid-compat";
import createPreventScroll from "@ec/solid-prevent-scroll2";
import { combineStyle } from "@ec/solid-primitives2/props";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Component, onCleanup, Show } from "solid-js";
import { DismissableLayer, type DismissableLayerRenderProps } from "../dismissable-layer";
import type { ElementOf, PolymorphicProps } from "../polymorphic";
import { Popper } from "../popper";
import {
  createFocusScope,
  createHideOutside,
  type FocusOutsideEvent,
  type InteractOutsideEvent,
  type PointerDownOutsideEvent,
} from "../primitives";
import { type PopoverDataSet, usePopoverContext } from "./popover-context";

export interface PopoverContentOptions {
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
}

export interface PopoverContentCommonProps<T extends HTMLElement = HTMLElement> {
  id: string;
  ref: T | ((el: T) => void);
  style?: JSX.CSSProperties | string;
}

export interface PopoverContentRenderProps extends PopoverContentCommonProps, DismissableLayerRenderProps, PopoverDataSet {
  "aria-describedby": string | undefined;
  "aria-labelledby": string | undefined;
  role: "dialog";
  tabIndex: -1;
}

export type PopoverContentProps<T extends ValidComponent | HTMLElement = HTMLElement> = PopoverContentOptions &
  Partial<PopoverContentCommonProps<ElementOf<T>>>;

/**
 * Contains the content to be rendered when the popover is open.
 */
export function PopoverContent<T extends ValidComponent = "div">(props: PolymorphicProps<T, PopoverContentProps<T>>) {
  let ref: HTMLElement | undefined;

  const context = usePopoverContext();

  const mergedProps = mergeDefaultProps(
    {
      id: context.generateId("content"),
    },
    props as PopoverContentProps
  );

  const [local, others] = splitProps(mergedProps, [
    "ref",
    "style",
    "onOpenAutoFocus",
    "onCloseAutoFocus",
    "onPointerDownOutside",
    "onFocusOutside",
    "onInteractOutside",
  ]);

  let isRightClickOutside = false;
  let hasInteractedOutside = false;
  let hasPointerDownOutside = false;

  const onCloseAutoFocus = (e: Event) => {
    local.onCloseAutoFocus?.(e);

    if (context.isModal()) {
      e.preventDefault();

      if (!isRightClickOutside) {
        focusWithoutScrolling(context.triggerRef());
      }
    } else {
      if (!e.defaultPrevented) {
        if (!hasInteractedOutside) {
          focusWithoutScrolling(context.triggerRef());
        }

        // Always prevent autofocus because we either focus manually or want user agent focus
        e.preventDefault();
      }

      hasInteractedOutside = false;
      hasPointerDownOutside = false;
    }
  };

  const onPointerDownOutside = (e: PointerDownOutsideEvent) => {
    local.onPointerDownOutside?.(e);

    if (context.isModal()) {
      isRightClickOutside = e.detail.isContextMenu;
    }
  };

  const onFocusOutside = (e: FocusOutsideEvent) => {
    local.onFocusOutside?.(e);

    // When focus is trapped, a `focusout` event may still happen.
    // We make sure we don't trigger our `onDismiss` in such case.
    if (context.isOpen() && context.isModal()) {
      e.preventDefault();
    }
  };

  const onInteractOutside = (e: InteractOutsideEvent) => {
    local.onInteractOutside?.(e);

    if (context.isModal()) {
      return;
    }

    // Non-modal behavior below

    if (!e.defaultPrevented) {
      hasInteractedOutside = true;

      if (e.detail.originalEvent.type === "pointerdown") {
        hasPointerDownOutside = true;
      }
    }

    // Prevent dismissing when clicking the trigger.
    // As the trigger is already setup to close, without doing so would
    // cause it to close and immediately open.
    if (contains(context.triggerRef(), e.target as HTMLElement)) {
      e.preventDefault();
    }

    // On Safari if the trigger is inside a container with tabIndex={0}, when clicked
    // we will get the pointer down outside event on the trigger, but then a subsequent
    // focus outside event on the container, we ignore any focus outside event when we've
    // already had a pointer down outside event.
    if (e.detail.originalEvent.type === "focusin" && hasPointerDownOutside) {
      e.preventDefault();
    }
  };

  // aria-hide everything except the content (better supported equivalent to setting aria-modal)
  createHideOutside({
    isDisabled: () => !(context.isOpen() && context.isModal()),
    targets: () => (ref ? [ref] : []),
  });

  createPreventScroll({
    element: () => ref ?? null,
    enabled: () => context.contentPresent() && context.preventScroll(),
  });

  createFocusScope(
    {
      trapFocus: () => context.isOpen() && context.isModal(),
      onMountAutoFocus: local.onOpenAutoFocus,
      onUnmountAutoFocus: onCloseAutoFocus,
    },
    () => ref
  );

  createEffect(() => onCleanup(context.registerContentId(others.id!)));

  return (
    <Show when={context.contentPresent()}>
      <Popper.Positioner>
        <DismissableLayer<Component<Omit<PopoverContentRenderProps, keyof DismissableLayerRenderProps>>>
          aria-describedby={context.descriptionId()}
          aria-labelledby={context.titleId()}
          disableOutsidePointerEvents={context.isOpen() && context.isModal()}
          excludedElements={[context.triggerRef]}
          onDismiss={context.close}
          onFocusOutside={onFocusOutside}
          onInteractOutside={onInteractOutside}
          onPointerDownOutside={onPointerDownOutside}
          ref={mergeRefs((el) => {
            context.setContentRef(el);
            ref = el;
          }, local.ref)}
          role="dialog"
          style={combineStyle(
            {
              "--kb-popover-content-transform-origin": "var(--kb-popper-content-transform-origin)",
              position: "relative",
            },
            local.style
          )}
          tabIndex={-1}
          {...context.dataset()}
          {...others}
        />
      </Popper.Positioner>
    </Show>
  );
}
