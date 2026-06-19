import { createContext } from "solid-js";

// CONTEXT ----------------------------------------------------------------------------------------------------------------------------------
export const DismissableLayerContext = createContext<DismissableLayerContextValue | null>(null);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DismissableLayerContextValue = {
  registerNestedLayer: (element: Element) => () => void;
};
