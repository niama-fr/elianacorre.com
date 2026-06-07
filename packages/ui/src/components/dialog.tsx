import {
  CloseButton as DialogPrimitiveCloseButton,
  type DialogCloseButtonProps as DialogPrimitiveCloseButtonProps,
  Content as DialogPrimitiveContent,
  type DialogContentProps as DialogPrimitiveContentProps,
  Description as DialogPrimitiveDescription,
  type DialogDescriptionProps as DialogPrimitiveDescriptionProps,
  Overlay as DialogPrimitiveOverlay,
  type DialogOverlayProps as DialogPrimitiveOverlayProps,
  Portal as DialogPrimitivePortal,
  type DialogPortalProps as DialogPrimitivePortalProps,
  Root as DialogPrimitiveRoot,
  type DialogRootProps as DialogPrimitiveRootProps,
  Title as DialogPrimitiveTitle,
  type DialogTitleProps as DialogPrimitiveTitleProps,
  Trigger as DialogPrimitiveTrigger,
  type DialogTriggerProps as DialogPrimitiveTriggerProps,
} from "@ec/kobalte2/dialog";
import type { PolymorphicProps } from "@ec/kobalte2/polymorphic";
import { Button } from "@ec/ui/button";
import type { ComponentProps, ValidComponent } from "@solidjs/web";
import { type Component, merge, omit, Show } from "solid-js";
import { cn } from "@/lib/utils";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Dialog: Component<DialogPrimitiveRootProps> = (props) => <DialogPrimitiveRoot data-slot="dialog" {...props} />;

// TRIGGER ---------------------------------------------------------------------------------------------------------------------------------
export const DialogTrigger = <T extends ValidComponent = "button">(props: DialogTriggerProps<T>) => (
  <DialogPrimitiveTrigger data-slot="dialog-trigger" {...props} />
);
type DialogTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<T, DialogPrimitiveTriggerProps<T>>;

// PORTAL ----------------------------------------------------------------------------------------------------------------------------------
export const DialogPortal = (props: DialogPrimitivePortalProps) => <DialogPrimitivePortal data-slot="dialog-portal" {...props} />;

// CLOSE -----------------------------------------------------------------------------------------------------------------------------------
export const DialogClose = <T extends ValidComponent = "button">(props: DialogCloseProps<T>) => (
  <DialogPrimitiveCloseButton data-slot="dialog-close" {...props} />
);
type DialogCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<T, DialogPrimitiveCloseButtonProps<T>>;

// OVERLAY ---------------------------------------------------------------------------------------------------------------------------------
const DialogOverlay = <T extends ValidComponent = "div">(_: DialogOverlayProps<T>) => {
  const rest = omit(_ as DialogOverlayProps, "class");
  return <DialogPrimitiveOverlay class={cn("fixed inset-0 isolate z-50 z-dialog-overlay", _.class)} data-slot="dialog-overlay" {...rest} />;
};
type DialogOverlayProps<T extends ValidComponent = "div"> = PolymorphicProps<T, DialogPrimitiveOverlayProps<T>> &
  Pick<ComponentProps<T>, "class">;

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export const DialogContent = <T extends ValidComponent = "div">(props: DialogContentProps<T>) => {
  const _ = merge({ showCloseButton: true } as DialogContentProps, props);
  const rest = omit(_, "class", "children", "showCloseButton");
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitiveContent
        class={cn("fixed top-1/2 left-1/2 z-50 z-dialog-content w-full -translate-x-1/2 -translate-y-1/2 outline-none", _.class)}
        data-slot="dialog-content"
        {...rest}
      >
        {_.children}
        <Show when={_.showCloseButton}>
          <DialogPrimitiveCloseButton as={Button} class="z-dialog-close" data-slot="dialog-close" size="icon-sm" variant="ghost">
            <span class="icon-[lucide--x]" />
            <span class="sr-only">Close</span>
          </DialogPrimitiveCloseButton>
        </Show>
      </DialogPrimitiveContent>
    </DialogPortal>
  );
};
type DialogContentProps<T extends ValidComponent = "div"> = PolymorphicProps<T, DialogPrimitiveContentProps<T>> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showCloseButton?: boolean;
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
        <DialogPrimitiveCloseButton as={Button} variant="outline">
          Close
        </DialogPrimitiveCloseButton>
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
  return <DialogPrimitiveTitle class={cn("z-dialog-title z-font-heading", _.class)} data-slot="dialog-title" {...rest} />;
};
type DialogTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<T, DialogPrimitiveTitleProps<T>> &
  Pick<ComponentProps<T>, "class">;

// DESCRIPTION -----------------------------------------------------------------------------------------------------------------------------
export const DialogDescription = <T extends ValidComponent = "p">(_: DialogDescriptionProps<T>) => {
  const rest = omit(_ as DialogDescriptionProps, "class");
  return <DialogPrimitiveDescription class={cn("z-dialog-description", _.class)} data-slot="dialog-description" {...rest} />;
};
type DialogDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<T, DialogPrimitiveDescriptionProps<T>> &
  Pick<ComponentProps<T>, "class">;
