import type { Orientation } from "@ec/kobalte2/utils";
import { type Accessor, createContext, type Setter, useContext } from "solid-js";

export type MenubarDataSet = {
  "data-closed": string | undefined;
  "data-expanded": string | undefined;
};

export type MenubarContextValue = {
  autoFocusMenu: Accessor<boolean>;
  closeMenu: () => void;
  dataset: Accessor<MenubarDataSet>;
  generateId: (part: string) => string;
  lastValue: Accessor<string | undefined>;
  menuRefMap: Accessor<Map<string, HTMLElement[]>>;
  menuRefs: Accessor<HTMLElement[]>;
  menus: Accessor<Set<string>>;
  nextMenu: () => void;
  orientation: Accessor<Orientation>;
  previousMenu: () => void;
  registerMenu: (value: string, refs: HTMLElement[]) => void;
  setAutoFocusMenu: Setter<boolean>;
  setLastValue: (next: string | ((prev: string | undefined) => string | undefined) | undefined) => void;
  setValue: (next: string | ((prev: string | undefined | null) => string | undefined) | undefined | null) => void;
  unregisterMenu: (value: string) => void;
  value: Accessor<string | undefined | null>;
};

export const MenubarContext = createContext<MenubarContextValue | null>(null);

export function useOptionalMenubarContext() {
  return useContext(MenubarContext) ?? undefined;
}

export function useMenubarContext() {
  const context = useOptionalMenubarContext();

  if (context === undefined) {
    throw new Error("[kobalte]: `useMenubarContext` must be used within a `Menubar` component");
  }

  return context;
}
