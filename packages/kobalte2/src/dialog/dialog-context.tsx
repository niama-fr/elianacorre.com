import { type Accessor, createContext, type Setter } from "solid-js";
import type { DialogIntlTranslations } from "./dialog.intl";

// CONTEXT ----------------------------------------------------------------------------------------------------------------------------------
export const DialogContext = createContext<DialogContextValue>();

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DialogContextValue = {
  translations: Accessor<DialogIntlTranslations>;
  isOpen: Accessor<boolean>;
  modal: Accessor<boolean>;
  preventScroll: Accessor<boolean>;
  contentId: Accessor<string | undefined>;
  titleId: Accessor<string | undefined>;
  descriptionId: Accessor<string | undefined>;
  triggerRef: Accessor<HTMLElement | undefined>;
  overlayRef: Accessor<HTMLElement | undefined>;
  setOverlayRef: Setter<HTMLElement | undefined>;
  contentRef: Accessor<HTMLElement | undefined>;
  setContentRef: Setter<HTMLElement | undefined>;
  overlayPresent: Accessor<boolean>;
  contentPresent: Accessor<boolean>;
  close: () => void;
  toggle: () => void;
  setTriggerRef: Setter<HTMLElement | undefined>;
  generateId: (part: string) => string;
  registerContentId: (id: string) => () => void;
  registerTitleId: (id: string) => () => void;
  registerDescriptionId: (id: string) => () => void;
};
