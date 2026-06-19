import { createContext, useContext } from "solid-js";

export type MenuGroupContextValue = {
  generateId: (part: string) => string;
  registerLabelId: (id: string) => () => void;
};

export const MenuGroupContext = createContext<MenuGroupContextValue | null>(null);

export function useMenuGroupContext() {
  const context = useContext(MenuGroupContext);

  if (context === null) {
    throw new Error("[kobalte]: `useMenuGroupContext` must be used within a `Menu.Group` component");
  }

  return context;
}
