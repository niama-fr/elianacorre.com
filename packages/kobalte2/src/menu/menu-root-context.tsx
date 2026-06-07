import type { Orientation } from "@ec/kobalte2/utils";
import { type Accessor, createContext, useContext } from "solid-js";

export type MenuRootContextValue = {
  isModal: Accessor<boolean>;
  preventScroll: Accessor<boolean>;
  forceMount: Accessor<boolean>;
  generateId: (part: string) => string;
  orientation: Accessor<Orientation>;

  /** Used for Menubar */
  value: Accessor<string | undefined>;
};

export const MenuRootContext = createContext<MenuRootContextValue | null>(null);

export function useMenuRootContext() {
  const context = useContext(MenuRootContext);

  if (context === null) {
    throw new Error("[kobalte]: `useMenuRootContext` must be used within a `MenuRoot` component");
  }

  return context;
}
