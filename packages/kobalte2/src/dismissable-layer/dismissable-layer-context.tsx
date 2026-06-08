import { createContext } from "solid-js";

// CONTEXT ----------------------------------------------------------------------------------------------------------------------------------
export const DismissableLayerContext = createContext<DismissableLayerContextValue>();

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DismissableLayerContextValue = {
  registerNestedLayer: (element: Element) => () => void;
};
