import type { PolymorphicProps } from "@kobalte/core/polymorphic";
// biome-ignore lint/performance/noNamespaceImport: false positive
import * as PopoverPrimitive from "@kobalte/core/popover";
import { cn } from "@ui/lib/utils";
import { cva } from "class-variance-authority";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const POPOVER = {
  content:
    cva(`z-50 flex w-72 origin-(--kb-popover-content-transform-origin) flex-col gap-4 rounded-2xl bg-popover p-4 text-popover-foreground 
    text-sm shadow-2xl outline-hidden ring-1 ring-foreground/5 duration-100  
    data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:animate-out
    data-expanded:fade-in-0 data-expanded:zoom-in-95 data-expanded:animate-in 
    data-[side=bottom]:slide-in-from-top-2 
    data-[side=left]:slide-in-from-right-2 
    data-[side=right]:slide-in-from-left-2 
    data-[side=top]:slide-in-from-bottom-2`),
  description: cva("text-muted-foreground"),
  header: cva("flex flex-col gap-1 text-sm"),
  title: cva("font-heading font-medium text-base"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Popover = (props: PopoverProps) => {
  const mergedProps = mergeProps({ gutter: 4, placement: "bottom" } as const, props);
  return <PopoverPrimitive.Root data-slot="popover" {...mergedProps} />;
};
type PopoverProps = PopoverPrimitive.PopoverRootProps;

// ANCHOR ----------------------------------------------------------------------------------------------------------------------------------
export const PopoverAnchor = <T extends ValidComponent = "div">(props: PopoverAnchorProps<T>) => (
  <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
);
type PopoverAnchorProps<T extends ValidComponent = "div"> = PolymorphicProps<T, PopoverPrimitive.PopoverAnchorProps<T>>;

// ARROW -----------------------------------------------------------------------------------------------------------------------------------
export const PopoverArrow = <T extends ValidComponent = "div">(props: PopoverArrowProps<T>) => {
  const [local, others] = splitProps(props as PopoverArrowProps, ["class"]);
  return <PopoverPrimitive.Arrow class={local.class} data-slot="popover-arrow" {...others} />;
};
type PopoverArrowProps<T extends ValidComponent = "div"> = PolymorphicProps<T, PopoverPrimitive.PopoverArrowProps<T>> &
  Pick<ComponentProps<T>, "class">;

// CLOSE BUTTON ----------------------------------------------------------------------------------------------------------------------------
export const PopoverCloseButton = <T extends ValidComponent = "button">(props: PopoverCloseButtonProps<T>) => {
  const [local, others] = splitProps(props as PopoverCloseButtonProps, ["class"]);
  return <PopoverPrimitive.CloseButton class={local.class} data-slot="popover-close-button" {...others} />;
};
type PopoverCloseButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<T, PopoverPrimitive.PopoverCloseButtonProps<T>> &
  Pick<ComponentProps<T>, "class">;

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export const PopoverContent = <T extends ValidComponent = "div">(props: PopoverContentProps<T>) => {
  const [local, others] = splitProps(props as PopoverContentProps, ["class", "children"]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content class={cn(POPOVER.content(), local.class)} data-slot="popover-content" {...others}>
        {local.children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
};
type PopoverContentProps<T extends ValidComponent = "div"> = PolymorphicProps<T, PopoverPrimitive.PopoverContentProps<T>> &
  Pick<ComponentProps<T>, "class" | "children">;

// DESCRIPTION -----------------------------------------------------------------------------------------------------------------------------
export const PopoverDescription = <T extends ValidComponent = "p">(props: PopoverDescriptionProps<T>) => {
  const [local, others] = splitProps(props as PopoverDescriptionProps, ["class"]);
  return <PopoverPrimitive.Description class={cn(POPOVER.description(), local.class)} data-slot="popover-description" {...others} />;
};
type PopoverDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<T, PopoverPrimitive.PopoverDescriptionProps<T>> &
  Pick<ComponentProps<T>, "class">;

// HEADER ----------------------------------------------------------------------------------------------------------------------------------
export const PopoverHeader = (props: PopoverHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn(POPOVER.header(), local.class)} data-slot="popover-header" {...others} />;
};
type PopoverHeaderProps = ComponentProps<"div"> & {
  class?: string | undefined;
};

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export const PopoverTitle = <T extends ValidComponent = "h2">(props: PopoverTitleProps<T>) => {
  const [local, others] = splitProps(props as PopoverTitleProps, ["class"]);
  return <PopoverPrimitive.Title class={cn(POPOVER.title(), local.class)} data-slot="popover-title" {...others} />;
};
type PopoverTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<T, PopoverPrimitive.PopoverTitleProps<T>> &
  Pick<ComponentProps<T>, "class">;

// TRIGGER ---------------------------------------------------------------------------------------------------------------------------------
export const PopoverTrigger = <T extends ValidComponent = "button">(props: PopoverTriggerProps<T>) => (
  <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
);
type PopoverTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<T, PopoverPrimitive.PopoverTriggerProps<T>>;
