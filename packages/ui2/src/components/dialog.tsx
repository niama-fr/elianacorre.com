import {
  DialogCloseButton as DialogCloseButton_,
  type DialogCloseButtonProps as DialogCloseButtonProps_,
  DialogContent as DialogContent_,
  type DialogContentProps as DialogContentProps_,
  DialogDescription as DialogDescription_,
  type DialogDescriptionProps as DialogDescriptionProps_,
  DialogOverlay as DialogOverlay_,
  type DialogOverlayProps as DialogOverlayProps_,
  DialogPortal as DialogPortal_,
  type DialogPortalProps as DialogPortalProps_,
  DialogRoot as DialogRoot_,
  type DialogRootProps as DialogRootProps_,
  DialogTitle as DialogTitle_,
  type DialogTitleProps as DialogTitleProps_,
  DialogTrigger as DialogTrigger_,
  type DialogTriggerProps as DialogTriggerProps_,
} from "@ec/kobalte2/dialog";
import type { PolymorphicProps } from "@ec/kobalte2/polymorphic";
import { Button } from "@ec/ui2/button";
import type { ComponentProps, ValidComponent } from "@solidjs/web";
import { type Component, merge, omit, Show } from "solid-js";
import { cn } from "../lib/utils";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Dialog: Component<DialogRootProps_> = (props) => <DialogRoot_ data-slot="dialog" {...props} />;

// TRIGGER ---------------------------------------------------------------------------------------------------------------------------------
export const DialogTrigger = <T extends ValidComponent = "button">(props: DialogTriggerProps<T>) => (
  <DialogTrigger_ data-slot="dialog-trigger" {...props} />
);
type DialogTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<T, DialogTriggerProps_<T>>;

// PORTAL ----------------------------------------------------------------------------------------------------------------------------------
export const DialogPortal = (props: DialogPortalProps_) => <DialogPortal_ data-slot="dialog-portal" {...props} />;

// CLOSE -----------------------------------------------------------------------------------------------------------------------------------
export const DialogClose = <T extends ValidComponent = "button">(props: DialogCloseProps<T>) => (
  <DialogCloseButton_ data-slot="dialog-close" {...props} />
);
type DialogCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<T, DialogCloseButtonProps_<T>>;

// OVERLAY ---------------------------------------------------------------------------------------------------------------------------------
const DialogOverlay = <T extends ValidComponent = "div">(_: DialogOverlayProps<T>) => {
  const rest = omit(_ as DialogOverlayProps, "class");
  return <DialogOverlay_ class={cn("fixed inset-0 isolate z-50 z-dialog-overlay", _.class)} data-slot="dialog-overlay" {...rest} />;
};
type DialogOverlayProps<T extends ValidComponent = "div"> = PolymorphicProps<T, DialogOverlayProps_<T>> & Pick<ComponentProps<T>, "class">;

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export const DialogContent = <T extends ValidComponent = "div">(props: DialogContentProps<T>) => {
  const _ = merge({ showCloseButton: true } as DialogContentProps, props);
  const rest = omit(_, "class", "children", "showCloseButton");
  return (
    <DialogPortal>
      <DialogOverlay class={_.overlayClass} />
      <DialogContent_
        class={cn("fixed top-1/2 left-1/2 z-50 z-dialog-content w-full -translate-x-1/2 -translate-y-1/2 outline-none", _.class)}
        data-slot="dialog-content"
        {...rest}
      >
        {_.children}
        <Show when={_.showCloseButton}>
          <DialogCloseButton_ as={Button} class="z-dialog-close" data-slot="dialog-close" size="icon-sm" variant="ghost">
            <span class="icon-[lucide--x]" />
            <span class="sr-only">Close</span>
          </DialogCloseButton_>
        </Show>
      </DialogContent_>
    </DialogPortal>
  );
};
type DialogContentProps<T extends ValidComponent = "div"> = PolymorphicProps<T, DialogContentProps_<T>> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showCloseButton?: boolean;
    overlayClass?: string;
  };

// HEADER ----------------------------------------------------------------------------------------------------------------------------------
export const DialogHeader = (_: DialogHeaderProps) => {
  const rest = omit(_, "class");
  return <div class={cn("z-dialog-header flex flex-col", _.class)} data-slot="dialog-header" {...rest} />;
};
type DialogHeaderProps = ComponentProps<"div">;

// FOOTER ----------------------------------------------------------------------------------------------------------------------------------
export const DialogFooter = <T extends ValidComponent = "div">(props: DialogFooterProps<T>) => {
  const _ = merge({ showCloseButton: false } as DialogFooterProps, props);
  const rest = omit(_, "class", "children", "showCloseButton");
  return (
    <div class={cn("z-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", _.class)} data-slot="dialog-footer" {...rest}>
      {_.children}
      <Show when={_.showCloseButton}>
        <DialogCloseButton_ as={Button} variant="outline">
          Close
        </DialogCloseButton_>
      </Show>
    </div>
  );
};
type DialogFooterProps<T extends ValidComponent = "div"> = PolymorphicProps<T, ComponentProps<"div">> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showCloseButton?: boolean;
  };

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export const DialogTitle = <T extends ValidComponent = "h2">(_: DialogTitleProps<T>) => {
  const rest = omit(_ as DialogTitleProps, "class");
  return <DialogTitle_ class={cn("z-dialog-title z-font-heading", _.class)} data-slot="dialog-title" {...rest} />;
};
type DialogTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<T, DialogTitleProps_> & Pick<ComponentProps<T>, "class">;

// DESCRIPTION -----------------------------------------------------------------------------------------------------------------------------
export const DialogDescription = <T extends ValidComponent = "p">(_: DialogDescriptionProps<T>) => {
  const rest = omit(_ as DialogDescriptionProps, "class");
  return <DialogDescription_ class={cn("z-dialog-description", _.class)} data-slot="dialog-description" {...rest} />;
};
type DialogDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<T, DialogDescriptionProps_> &
  Pick<ComponentProps<T>, "class">;
