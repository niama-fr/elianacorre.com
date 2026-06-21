import * as SheetPrimitive from "@ec/kobalte2/dialog";
import type { PolymorphicProps } from "@ec/kobalte2/polymorphic";
import { X } from "lucide-solid";
import type { Component, ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const Sheet: Component<SheetPrimitive.DialogRootProps> = (props) => <SheetPrimitive.Root data-slot="sheet" {...props} />;

type SheetTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<T, SheetPrimitive.DialogTriggerProps<T>>;

const SheetTrigger = <T extends ValidComponent = "button">(props: SheetTriggerProps<T>) => (
  <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
);

type SheetCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<T, SheetPrimitive.DialogCloseButtonProps<T>>;

const SheetClose = <T extends ValidComponent = "button">(props: SheetCloseProps<T>) => (
  <SheetPrimitive.CloseButton data-slot="sheet-close" {...props} />
);

const SheetPortal = (props: SheetPrimitive.DialogPortalProps) => <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;

type SheetOverlayProps<T extends ValidComponent = "div"> = PolymorphicProps<T, SheetPrimitive.DialogOverlayProps<T>> &
  Pick<ComponentProps<T>, "class">;

const SheetOverlay = <T extends ValidComponent = "div">(props: SheetOverlayProps<T>) => {
  const [local, others] = splitProps(props as SheetOverlayProps, ["class"]);
  return <SheetPrimitive.Overlay class={cn("fixed inset-0 z-50 z-sheet-overlay", local.class)} data-slot="sheet-overlay" {...others} />;
};

type SheetContentProps<T extends ValidComponent = "div"> = PolymorphicProps<T, SheetPrimitive.DialogContentProps<T>> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    side?: "top" | "right" | "bottom" | "left";
    showCloseButton?: boolean;
  };

const SheetContent = <T extends ValidComponent = "div">(props: SheetContentProps<T>) => {
  const mergedProps = mergeProps({ side: "right", showCloseButton: true } as SheetContentProps, props);
  const [local, others] = splitProps(mergedProps, ["class", "children", "side", "showCloseButton"]);
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content class={cn("z-sheet-content", local.class)} data-side={local.side} data-slot="sheet-content" {...others}>
        {local.children}
        <Show when={local.showCloseButton}>
          <SheetPrimitive.CloseButton as={Button} class="z-sheet-close" data-slot="sheet-close" size="icon-sm" variant="ghost">
            <X />
            <span class="sr-only">Close</span>
          </SheetPrimitive.CloseButton>
        </Show>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
};

type SheetHeaderProps = ComponentProps<"div">;

const SheetHeader = (props: SheetHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("z-sheet-header flex flex-col", local.class)} data-slot="sheet-header" {...others} />;
};

type SheetFooterProps = ComponentProps<"div">;

const SheetFooter = (props: SheetFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("z-sheet-footer mt-auto flex flex-col", local.class)} data-slot="sheet-footer" {...others} />;
};

type SheetTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<T, SheetPrimitive.DialogTitleProps<T>> &
  Pick<ComponentProps<T>, "class">;

const SheetTitle = <T extends ValidComponent = "h2">(props: SheetTitleProps<T>) => {
  const [local, others] = splitProps(props as SheetTitleProps, ["class"]);
  return <SheetPrimitive.Title class={cn("z-font-heading z-sheet-title", local.class)} data-slot="sheet-title" {...others} />;
};

type SheetDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<T, SheetPrimitive.DialogDescriptionProps<T>> &
  Pick<ComponentProps<T>, "class">;

const SheetDescription = <T extends ValidComponent = "p">(props: SheetDescriptionProps<T>) => {
  const [local, others] = splitProps(props as SheetDescriptionProps, ["class"]);
  return <SheetPrimitive.Description class={cn("z-sheet-description", local.class)} data-slot="sheet-description" {...others} />;
};

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
