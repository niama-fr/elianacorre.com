import { type ButtonRootProps, Root } from "@kobalte/core/button";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, splitProps, type ValidComponent } from "solid-js";
import { cn } from "@/lib/utils";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const BUTTON = cva(
  `group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-4xl border 
  border-transparent bg-clip-padding font-medium text-sm outline-none transition-all 
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 
  active:not-aria-[haspopup]:translate-y-px 
  disabled:pointer-events-none disabled:opacity-50 
  aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 
  [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border-border bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost: "hover:bg-accent hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Button = <T extends ValidComponent = "button">(props: ButtonProps<T>) => {
  const [_, others] = splitProps(props as ButtonProps, ["variant", "size", "class"]);
  return <Root class={cn(BUTTON({ variant: _.variant, size: _.size }), _.class)} data-slot="button" {...others} />;
};
export type ButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<T, ButtonRootProps<T>> &
  VariantProps<typeof BUTTON> &
  Pick<ComponentProps<T>, "class">;
