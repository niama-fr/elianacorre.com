import { type Accessor, createContext, type Setter, useContext } from "solid-js";
import type { Placement } from "../popper/utils";

export type NavigationMenuDataSet = {
  "data-closed": string | undefined;
  "data-expanded": string | undefined;
};

export type NavigationMenuContextValue = {
  autoFocusMenu: Accessor<boolean>;
  cancelLeaveTimer: () => void;
  currentPlacement: Accessor<Placement>;
  dataset: Accessor<NavigationMenuDataSet>;
  delayDuration: Accessor<number>;
  previousMenu: Accessor<string | undefined>;
  rootRef: Accessor<HTMLElement | undefined>;
  setAutoFocusMenu: Setter<boolean>;
  setPreviousMenu: Setter<string | undefined>;
  setRootRef: Setter<HTMLElement>;
  setViewportRef: Setter<HTMLElement>;
  skipDelayDuration: Accessor<number>;
  startLeaveTimer: () => void;
  viewportPresent: Accessor<boolean>;
  viewportRef: Accessor<HTMLElement | undefined>;
};

export const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null);

export function useOptionalNavigationMenuContext() {
  return useContext(NavigationMenuContext) ?? undefined;
}

export function useNavigationMenuContext() {
  const context = useOptionalNavigationMenuContext();

  if (context === undefined) {
    throw new Error("[kobalte]: `useNavigationMenuContext` must be used within a `NavigationMenu` component");
  }

  return context;
}
