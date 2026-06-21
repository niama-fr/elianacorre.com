import { composeEventHandlers, mergeRefs, type Orientation } from "@ec/kobalte2/utils";
import { createEffect, on, splitProps } from "@ec/kobalte2/utils/solid-compat";
import { combineStyle } from "@ec/solid-primitives2/props";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { DismissableLayer, type DismissableLayerRenderProps } from "../dismissable-layer";
import { type MenubarDataSet, useMenubarContext } from "../menubar/menubar-context";
import type { ElementOf, PolymorphicProps } from "../polymorphic";
import { Popper } from "../popper";
import type { FocusOutsideEvent, InteractOutsideEvent, PointerDownOutsideEvent } from "../primitives/create-interact-outside";
import { createSize } from "../primitives/create-size";
import { useNavigationMenuContext } from "./navigation-menu-context";

export interface NavigationMenuViewportOptions {
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
   * Event handler called when a pointer event occurs outside the bounds of the component.
   * It can be prevented by calling `event.preventDefault`.
   */
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void;
}

export interface NavigationMenuViewportCommonProps<T extends HTMLElement = HTMLElement> {
  ref: T | ((el: T) => void);
  style: JSX.CSSProperties | string;
}

export interface NavigationMenuViewportRenderProps extends NavigationMenuViewportCommonProps, DismissableLayerRenderProps, MenubarDataSet {
  "data-orientation": Orientation;
}

export type NavigationMenuViewportProps<T extends ValidComponent | HTMLElement = HTMLElement> = NavigationMenuViewportOptions &
  Partial<NavigationMenuViewportCommonProps<ElementOf<T>>>;

export function NavigationMenuViewport<T extends ValidComponent = "li">(props: PolymorphicProps<T, NavigationMenuViewportProps<T>>) {
  const context = useNavigationMenuContext();
  const menubarContext = useMenubarContext();

  const [ref, setRef] = createSignal<HTMLElement>();

  const [local, others] = splitProps(props as NavigationMenuViewportProps, ["ref", "style", "onEscapeKeyDown"]);

  const close = () => {
    menubarContext.setAutoFocusMenu(false);
    menubarContext.closeMenu();
  };

  const onEscapeKeyDown = (e: KeyboardEvent) => {
    close();
  };

  const size = createSize(ref);

  createEffect(
    on(
      () => (menubarContext.value() ? menubarContext.menuRefMap().get(menubarContext.value()!) : undefined),
      (menu) => {
        if (menu === undefined || menu[0] === undefined) return;
        setRef(menu[0]);
      }
    )
  );

  const height = createMemo((prev) => {
    if (ref() === undefined || !context.viewportPresent()) return undefined;
    if (size.height() === 0) return prev;
    return size.height();
  });
  const width = createMemo((prev) => {
    if (ref() === undefined || !context.viewportPresent()) return undefined;
    if (size.width() === 0) return prev;
    return size.width();
  });

  return (
    <Show when={context.viewportPresent()}>
      <Popper.Positioner role="presentation">
        <DismissableLayer<Component<Omit<NavigationMenuViewportRenderProps, keyof DismissableLayerRenderProps>>>
          as="li"
          bypassTopMostLayerCheck
          data-orientation={menubarContext.orientation()}
          excludedElements={[context.rootRef]}
          onDismiss={close}
          onEscapeKeyDown={composeEventHandlers([local.onEscapeKeyDown, onEscapeKeyDown])}
          ref={mergeRefs(context.setViewportRef, local.ref)}
          style={combineStyle(
            {
              "--kb-menu-content-transform-origin": "var(--kb-popper-content-transform-origin)",
              "--kb-navigation-menu-viewport-height": height() ? `${height()}px` : undefined,
              "--kb-navigation-menu-viewport-width": width() ? `${width()}px` : undefined,
              position: "relative",
            },
            local.style
          )}
          {...context.dataset()}
          {...others}
        />
      </Popper.Positioner>
    </Show>
  );
}
