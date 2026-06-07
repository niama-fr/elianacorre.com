import { type Accessor, createContext, useContext } from "solid-js";

import type { PopoverIntlTranslations } from "./popover.intl";

export type PopoverDataSet = {
  "data-expanded": string | undefined;
  "data-closed": string | undefined;
};

export type PopoverContextValue = {
  translations: Accessor<PopoverIntlTranslations>;
  dataset: Accessor<PopoverDataSet>;
  isOpen: Accessor<boolean>;
  isModal: Accessor<boolean>;
  preventScroll: Accessor<boolean>;
  contentPresent: Accessor<boolean>;
  triggerRef: Accessor<HTMLElement | undefined>;
  contentId: Accessor<string | undefined>;
  titleId: Accessor<string | undefined>;
  descriptionId: Accessor<string | undefined>;
  setDefaultAnchorRef: (el: HTMLElement) => void;
  setTriggerRef: (el: HTMLElement) => void;
  setContentRef: (el: HTMLElement) => void;
  close: () => void;
  toggle: () => void;
  generateId: (part: string) => string;
  registerContentId: (id: string) => () => void;
  registerTitleId: (id: string) => () => void;
  registerDescriptionId: (id: string) => () => void;
};

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopoverContext() {
  const context = useContext(PopoverContext);

  if (context === null) {
    throw new Error("[kobalte]: `usePopoverContext` must be used within a `Popover` component");
  }

  return context;
}
