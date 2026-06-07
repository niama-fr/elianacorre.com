import { createGenerateId, mergeDefaultProps } from "@ec/kobalte2/utils";
import createPresence from "@ec/solid-presence2";
import { createSignal, createUniqueId, omit, type ParentProps } from "solid-js";
import { createDisclosureState, createRegisterId } from "../primitives";
import { DIALOG_INTL_TRANSLATIONS, type DialogIntlTranslations } from "./dialog.intl";
import { DialogContext, type DialogContextValue } from "./dialog-context";

export type DialogRootOptions = {
  /**
   * The default open state when initially rendered.
   * Useful when you do not need to control the open state.
   */
  defaultOpen?: boolean;

  /**
   * Used to force mounting the dialog (portal, overlay and content) when more control is needed.
   * Useful when controlling animation with SolidJS animation libraries.
   */
  forceMount?: boolean;

  /**
   * A unique identifier for the component.
   * The id is used to generate id attributes for nested components.
   * If no id prop is provided, a generated id will be used.
   */
  id?: string;

  /**
   * Whether the dialog should be the only visible content for screen readers.
   * When set to `true`:
   * - interaction with outside elements will be disabled.
   * - scroll will be locked.
   * - focus will be locked inside the dialog content.
   * - elements outside the dialog content will not be visible for screen readers.
   */
  modal?: boolean;

  /** Event handler called when the open state of the dialog changes. */
  onOpenChange?: (isOpen: boolean) => void;

  /** The controlled open state of the dialog. */
  open?: boolean;

  /** Whether the scroll should be locked even if the dialog is not modal. */
  preventScroll?: boolean;
  /** The localized strings of the component. */
  translations?: DialogIntlTranslations;
};

export type DialogRootProps = ParentProps<DialogRootOptions>;

/**
 * A dialog is a window overlaid on either the primary window or another dialog window.
 */
export function DialogRoot(props: DialogRootProps) {
  const defaultId = `dialog-${createUniqueId()}`;

  const options = omit(props, "children");
  const mergedProps = mergeDefaultProps(
    {
      id: defaultId,
      modal: true,
      translations: DIALOG_INTL_TRANSLATIONS,
    },
    options
  );

  const [contentId, setContentId] = createSignal<string | undefined>(undefined, {
    ownedWrite: true,
  });
  const [titleId, setTitleId] = createSignal<string | undefined>(undefined, {
    ownedWrite: true,
  });
  const [descriptionId, setDescriptionId] = createSignal<string | undefined>(undefined, {
    ownedWrite: true,
  });

  const [overlayRef, setOverlayRef] = createSignal<HTMLElement>();
  const [contentRef, setContentRef] = createSignal<HTMLElement>();
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement>();

  const disclosureState = createDisclosureState({
    open: () => mergedProps.open,
    defaultOpen: () => mergedProps.defaultOpen,
    onOpenChange: (isOpen) => mergedProps.onOpenChange?.(isOpen),
  });

  const shouldMount = () => mergedProps.forceMount || disclosureState.isOpen();

  const { present: overlayPresent } = createPresence({
    show: shouldMount,
    element: () => overlayRef() ?? null,
  });

  const { present: contentPresent } = createPresence({
    show: shouldMount,
    element: () => contentRef() ?? null,
  });

  const context: DialogContextValue = {
    translations: () => mergedProps.translations ?? DIALOG_INTL_TRANSLATIONS,
    isOpen: disclosureState.isOpen,
    modal: () => mergedProps.modal ?? true,
    preventScroll: () => mergedProps.preventScroll ?? context.modal(),
    contentId,
    titleId,
    descriptionId,
    triggerRef,
    overlayRef,
    setOverlayRef,
    contentRef,
    setContentRef,
    overlayPresent,
    contentPresent,
    close: disclosureState.close,
    toggle: disclosureState.toggle,
    setTriggerRef,
    generateId: createGenerateId(() => mergedProps.id ?? defaultId),
    registerContentId: createRegisterId(setContentId),
    registerTitleId: createRegisterId(setTitleId),
    registerDescriptionId: createRegisterId(setDescriptionId),
  };

  return <DialogContext value={context}>{props.children}</DialogContext>;
}
