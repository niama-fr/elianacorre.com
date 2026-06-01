import type { JSX } from "@solidjs/web";
import { type Accessor, createContext, createEffect, createMemo, createSignal, createStore, onSettled, useContext } from "solid-js";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const HIDDEN_STAIN_STYLE = { height: "0px", opacity: "0", transform: "translate(0px, 0px)", width: "0px" } as const;

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const createHeaderStain = () => {
  let containerRef: HTMLElement | undefined;
  const stainTargetRefs = new Map<StainId, HTMLElement>();
  const [stain, setStain] = createStore<HeaderStainState>({
    active: undefined,
    hovered: undefined,
    styles: {},
  });
  const selectedStainId = createMemo(() => stain.hovered ?? stain.active);
  const style = createMemo<BoundsStyle>(() => {
    const stainId = selectedStainId();
    const style = stainId ? stain.styles[stainId] : undefined;

    if (!style) {
      return HIDDEN_STAIN_STYLE;
    }

    return {
      height: style.height,
      opacity: style.opacity,
      transform: style.transform,
      width: style.width,
    };
  });
  const intent = createMemo<StainIntent>(() => (selectedStainId()?.startsWith("social:") ? "primary" : "secondary"));

  const setStainStyle = (stainId: StainId, element: HTMLElement) =>
    setStain((state) => {
      state.styles[stainId] = stainStyleFromElement(element, containerRef);
    });

  const removeStainStyle = (stainId: StainId) =>
    setStain((state) => {
      delete state.styles[stainId];
    });

  const updateStainStyles = () => {
    setStain((state) => {
      for (const [stainId, element] of stainTargetRefs) {
        state.styles[stainId] = stainStyleFromElement(element, containerRef);
      }
    });
  };

  const observeTarget = (stainId: StainId, element: HTMLElement) => {
    stainTargetRefs.set(stainId, element);
    setStainStyle(stainId, element);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        stainTargetRefs.delete(stainId);
        removeStainStyle(stainId);
      };
    }

    const observer = new ResizeObserver(() => setStainStyle(stainId, element));
    observer.observe(element);

    return () => {
      observer.disconnect();
      stainTargetRefs.delete(stainId);
      removeStainStyle(stainId);
    };
  };

  const setActive = (stainId?: StainId) =>
    setStain((state) => {
      state.active = stainId;
    });

  const setHovered = (stainId?: StainId) =>
    setStain((state) => {
      state.hovered = stainId;
    });

  const observeContainer = (getContainer: () => HTMLElement | undefined) => {
    onSettled(() => {
      const container = getContainer();
      containerRef = container;

      if (!container || typeof ResizeObserver === "undefined") {
        return;
      }

      updateStainStyles();

      const observer = new ResizeObserver(updateStainStyles);
      observer.observe(container);

      return () => {
        containerRef = undefined;
        observer.disconnect();
      };
    });
  };

  const context: HeaderStainContextValue = {
    observeTarget,
    setHovered,
  };

  return { context, intent, observeContainer, setActive, setHovered, style };
};

// METHODS ---------------------------------------------------------------------------------------------------------------------------------
export const createHeaderStainTarget = <Element extends HTMLElement>(stainId: Accessor<StainId>) => {
  const [element, setElement] = createSignal<Element>();
  const { observeTarget, setHovered } = useContext(HeaderStainContext);
  const clearHovered = () => setHovered();
  const setTargetHovered = () => setHovered(stainId());

  createEffect(
    () => ({ element: element(), stainId: stainId() }),
    ({ element, stainId }) => {
      console.log(stainId, element);
      if (!element) {
        return;
      }

      return observeTarget(stainId, element);
    }
  );

  return {
    onBlur: clearHovered,
    onFocus: setTargetHovered,
    onFocusIn: setTargetHovered,
    onFocusOut: clearHovered,
    onPointerEnter: setTargetHovered,
    ref: setElement,
  };
};

export const stainIdFromNav = (nav: { key: string }) => `nav:${nav.key}`;
export const stainIdFromSocial = (social: { key: string }) => `social:${social.key}`;

const stainStyleFromElement = (element: HTMLElement, container?: HTMLElement): BoundsStyle => {
  if (!container) {
    return {
      height: `${element.offsetHeight}px`,
      opacity: "1",
      transform: "translate(0px, 0px)",
      width: `${element.offsetWidth}px`,
    };
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  return {
    height: `${elementRect.height}px`,
    opacity: "1",
    transform: `translate(${elementRect.left - containerRect.left}px, ${elementRect.top - containerRect.top}px)`,
    width: `${elementRect.width}px`,
  };
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type BoundsStyle = Required<Pick<JSX.CSSProperties, "height" | "opacity" | "transform" | "width">>;
type HeaderStainContextValue = {
  observeTarget: ObserveStainTarget;
  setHovered: (stainId?: StainId) => void;
};
type HeaderStainState = { active?: StainId; hovered?: StainId; styles: Record<StainId, BoundsStyle | undefined> };
type ObserveStainTarget = (stainId: StainId, element: HTMLElement) => () => void;
export type StainIntent = "primary" | "secondary";
type StainId = string;

// CONTEXT ---------------------------------------------------------------------------------------------------------------------------------
export const HeaderStainContext = createContext<HeaderStainContextValue>();
