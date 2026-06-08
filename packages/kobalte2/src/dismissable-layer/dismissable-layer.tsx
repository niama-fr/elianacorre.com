import { contains, getDocument, mergeRefs } from "@ec/kobalte2/utils";
import type { ValidComponent } from "@solidjs/web";
import { type Accessor, createEffect, omit, onSettled, untrack, useContext } from "solid-js";
import { type ElementOf, Polymorphic, type PolymorphicProps } from "../polymorphic";
import {
  createEscapeKeyDown,
  createInteractOutside,
  type FocusOutsideEvent,
  type InteractOutsideEvent,
  type PointerDownOutsideEvent,
} from "../primitives";
import { DismissableLayerContext, type DismissableLayerContextValue } from "./dismissable-layer-context";
import { layerStack } from "./layer-stack";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function DismissableLayer<T extends ValidComponent = "div">(_: PolymorphicProps<T, DismissableLayerProps<T>>) {
  let ref!: HTMLElement;

  const parentContext = useContext(DismissableLayerContext);

  const rest = omit(
    _ as DismissableLayerProps,
    "ref",
    "disableOutsidePointerEvents",
    "excludedElements",
    "onEscapeKeyDown",
    "onPointerDownOutside",
    "onFocusOutside",
    "onInteractOutside",
    "onDismiss",
    "bypassTopMostLayerCheck"
  );

  const nestedLayers = new Set<Element>([]);
  const disableOutsidePointerEvents = untrack(() => _.disableOutsidePointerEvents);

  const registerNestedLayer = (element: Element) => {
    nestedLayers.add(element);

    const parentUnregister = parentContext?.registerNestedLayer(element);

    return () => {
      nestedLayers.delete(element);
      parentUnregister?.();
    };
  };

  const shouldExcludeElement = (element: Element) => {
    if (!ref) return false;
    return _.excludedElements?.some((node) => contains(node(), element)) || [...nestedLayers].some((layer) => contains(layer, element));
  };

  const onPointerDownOutside = (e: PointerDownOutsideEvent) => {
    if (!ref || layerStack.isBelowPointerBlockingLayer(ref)) return;
    if (!(_.bypassTopMostLayerCheck || layerStack.isTopMostLayer(ref))) return;
    _.onPointerDownOutside?.(e);
    _.onInteractOutside?.(e);
    if (!e.defaultPrevented) _.onDismiss?.();
  };

  const onFocusOutside = (e: FocusOutsideEvent) => {
    _.onFocusOutside?.(e);
    _.onInteractOutside?.(e);
    if (!e.defaultPrevented) _.onDismiss?.();
  };

  createInteractOutside({ shouldExcludeElement, onPointerDownOutside, onFocusOutside }, () => ref);

  createEscapeKeyDown({
    ownerDocument: () => getDocument(ref),
    onEscapeKeyDown: (e) => {
      if (!(ref && layerStack.isTopMostLayer(ref))) return;

      _.onEscapeKeyDown?.(e);

      if (!e.defaultPrevented && _.onDismiss) {
        e.preventDefault();
        _.onDismiss();
      }
    },
  });

  onSettled(() => {
    layerStack.addLayer({ dismiss: _.onDismiss, isPointerBlocking: disableOutsidePointerEvents, node: ref });
    const unregisterFromParentLayer = parentContext?.registerNestedLayer(ref);
    layerStack.assignPointerEventToLayers();
    layerStack.disableBodyPointerEvents(ref);

    return () => {
      layerStack.removeLayer(ref);
      unregisterFromParentLayer?.();
      layerStack.assignPointerEventToLayers();
      layerStack.restoreBodyPointerEvents(ref);
    };
  });

  createEffect(
    () => _.disableOutsidePointerEvents,
    (disableOutsidePointerEvents) => {
      const layer = layerStack.find(ref);

      if (layer && layer.isPointerBlocking !== disableOutsidePointerEvents) {
        layer.isPointerBlocking = disableOutsidePointerEvents;
        layerStack.assignPointerEventToLayers();
      }

      if (disableOutsidePointerEvents) layerStack.disableBodyPointerEvents(ref);

      return () => layerStack.restoreBodyPointerEvents(ref);
    },
    { defer: true }
  );

  const context: DismissableLayerContextValue = { registerNestedLayer };

  return (
    <DismissableLayerContext value={context}>
      <Polymorphic<DismissableLayerRenderProps> as="div" ref={mergeRefs((el) => (ref = el), _.ref)} {...rest} />
    </DismissableLayerContext>
  );
}
export type DismissableLayerProps<T extends ValidComponent | HTMLElement = HTMLElement> = DismissableLayerOptions &
  Partial<DismissableLayerCommonProps<ElementOf<T>>>;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DismissableLayerOptions = {
  /** Whether to ignore the "top most layer" check on interact outside. */
  bypassTopMostLayerCheck?: boolean;
  /**
   * When `true`, hover/focus/click interactions will be disabled on elements outside
   * the layer. Users will need to click twice on outside elements to
   * interact with them: once to close the layer, and again to trigger the element.
   */
  disableOutsidePointerEvents?: boolean;

  /** A list of elements that should not dismiss the layer when interacted with. */
  excludedElements?: Accessor<HTMLElement | undefined>[];

  /** Handler called when the layer should be dismissed. */
  onDismiss?: () => void;

  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;

  /**
   * Event handler called when the focus moves outside the layer.
   * Can be prevented.
   */
  onFocusOutside?: (event: FocusOutsideEvent) => void;

  /**
   * Event handler called when an interaction happens outside the layer.
   * Specifically, when a `pointerdown` event happens outside or focus moves outside of it.
   * Can be prevented.
   */
  onInteractOutside?: (event: InteractOutsideEvent) => void;

  /**
   * Event handler called when a `pointerdown` event happens outside the layer.
   * Can be prevented.
   */
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void;
};

export type DismissableLayerCommonProps<T extends HTMLElement = HTMLElement> = {
  ref: T | ((el: T) => void);
};

export interface DismissableLayerRenderProps extends DismissableLayerCommonProps {}
