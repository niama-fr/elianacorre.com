import { createContext, useContext } from "solid-js";

export type DismissableLayerContextValue = {
  registerNestedLayer: (element: Element) => () => void;
};

export const DismissableLayerContext = createContext<DismissableLayerContextValue | null>(null);

export function useOptionalDismissableLayerContext() {
  return useContext(DismissableLayerContext) ?? undefined;
}
