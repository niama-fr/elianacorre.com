import { type Accessor, createContext, useContext } from "solid-js";

import type { ListState } from "../list";
import type { Placement } from "../popper/utils";
import type { CollectionItemWithRef } from "../primitives";
import type { FocusStrategy } from "../selection";
import type { GraceIntent, Side } from "./utils";

export type MenuDataSet = {
  "data-closed": string | undefined;
  "data-expanded": string | undefined;
};

export type MenuContextValue = {
  autoFocus: Accessor<FocusStrategy | boolean | undefined>;
  close: (recursively?: boolean) => void;
  contentId: Accessor<string | undefined>;
  contentPresent: Accessor<boolean>;
  contentRef: Accessor<HTMLElement | undefined>;
  currentPlacement: Accessor<Placement>;
  dataset: Accessor<MenuDataSet>;
  focusContent: () => void;
  isOpen: Accessor<boolean>;
  listState: Accessor<ListState>;
  nestedMenus: Accessor<Element[]>;
  onItemEnter: (e: PointerEvent) => void;
  onItemLeave: (e: PointerEvent) => void;
  onTriggerLeave: (e: PointerEvent) => void;
  open: (focusStrategy: FocusStrategy | boolean) => void;
  parentMenuContext: Accessor<MenuContextValue | undefined>;
  pointerGraceTimeoutId: Accessor<number>;
  registerContentId: (id: string) => () => void;
  registerItemToParentDomCollection: ((item: CollectionItemWithRef) => () => void) | undefined;
  registerNestedMenu: (element: HTMLElement) => () => void;
  registerTriggerId: (id: string) => () => void;
  setContentRef: (el: HTMLElement | undefined) => void;
  setPointerDir: (dir: Side) => void;
  setPointerGraceIntent: (intent: GraceIntent | null) => void;
  setPointerGraceTimeoutId: (id: number) => void;
  setTriggerRef: (el: HTMLElement) => void;
  toggle: (focusStrategy: FocusStrategy | boolean) => void;
  triggerId: Accessor<string | undefined>;
  triggerRef: Accessor<HTMLElement | undefined>;
};

export const MenuContext = createContext<MenuContextValue | null>(null);

export function useOptionalMenuContext() {
  return useContext(MenuContext) ?? undefined;
}

export function useMenuContext() {
  const context = useOptionalMenuContext();

  if (context === undefined) {
    throw new Error("[kobalte]: `useMenuContext` must be used within a `Menu` component");
  }

  return context;
}
