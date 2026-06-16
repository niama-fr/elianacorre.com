import type { PolymorphicProps } from "@kobalte/core/polymorphic";
// biome-ignore lint/performance/noNamespaceImport: false positive
import * as PopoverPrimitive from "@kobalte/core/popover";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

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
  return <PopoverPrimitive.Arrow class={cn("z-popover-arrow", local.class)} data-slot="popover-arrow" {...others} />;
};
type PopoverArrowProps<T extends ValidComponent = "div"> = PolymorphicProps<T, PopoverPrimitive.PopoverArrowProps<T>> &
  Pick<ComponentProps<T>, "class">;

// CLOSE BUTTON ----------------------------------------------------------------------------------------------------------------------------
export const PopoverCloseButton = <T extends ValidComponent = "button">(props: PopoverCloseButtonProps<T>) => {
  const [local, others] = splitProps(props as PopoverCloseButtonProps, ["class"]);
  return <PopoverPrimitive.CloseButton class={cn("z-popover-close-button", local.class)} data-slot="popover-close-button" {...others} />;
};
type PopoverCloseButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<T, PopoverPrimitive.PopoverCloseButtonProps<T>> &
  Pick<ComponentProps<T>, "class">;

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export const PopoverContent = <T extends ValidComponent = "div">(props: PopoverContentProps<T>) => {
  const [local, others] = splitProps(props as PopoverContentProps, ["class", "children"]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        class={cn("z-50 z-popover-content w-72 origin-(--kb-popover-content-transform-origin) outline-hidden", local.class)}
        data-slot="popover-content"
        {...others}
      >
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
  return <PopoverPrimitive.Description class={cn("z-popover-description", local.class)} data-slot="popover-description" {...others} />;
};
type PopoverDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<T, PopoverPrimitive.PopoverDescriptionProps<T>> &
  Pick<ComponentProps<T>, "class">;

// HEADER ----------------------------------------------------------------------------------------------------------------------------------
export const PopoverHeader = (props: PopoverHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("z-popover-header", local.class)} data-slot="popover-header" {...others} />;
};
type PopoverHeaderProps = ComponentProps<"div"> & {
  class?: string | undefined;
};

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export const PopoverTitle = <T extends ValidComponent = "h2">(props: PopoverTitleProps<T>) => {
  const [local, others] = splitProps(props as PopoverTitleProps, ["class"]);
  return <PopoverPrimitive.Title class={cn("z-font-heading z-popover-title", local.class)} data-slot="popover-title" {...others} />;
};
type PopoverTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<T, PopoverPrimitive.PopoverTitleProps<T>> &
  Pick<ComponentProps<T>, "class">;

// TRIGGER ---------------------------------------------------------------------------------------------------------------------------------
export const PopoverTrigger = <T extends ValidComponent = "button">(props: PopoverTriggerProps<T>) => (
  <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
);
type PopoverTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<T, PopoverPrimitive.PopoverTriggerProps<T>>;
