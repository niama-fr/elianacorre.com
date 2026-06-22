import { Button as Button_, type ButtonRootProps } from "@ec/kobalte2/button";
import type { PolymorphicProps } from "@ec/kobalte2/polymorphic";
import { cn } from "@ec/ui2/lib/utils";
import type { ComponentProps, ValidComponent } from "@solidjs/web";
import { cva, type VariantProps } from "class-variance-authority";
import { omit } from "solid-js";

const buttonVariants = cva(
  "group/button z-button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap outline-none transition-all active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "z-button-size-default",
        icon: "z-button-size-icon",
        "icon-lg": "z-button-size-icon-lg",
        "icon-sm": "z-button-size-icon-sm",
        "icon-xs": "z-button-size-icon-xs",
        lg: "z-button-size-lg",
        sm: "z-button-size-sm",
        xs: "z-button-size-xs",
      },
      variant: {
        default: "z-button-variant-default",
        destructive: "z-button-variant-destructive",
        ghost: "z-button-variant-ghost",
        link: "z-button-variant-link",
        outline: "z-button-variant-outline",
        secondary: "z-button-variant-secondary",
      },
    },
  }
);

type ButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<T, ButtonRootProps<T>> &
  VariantProps<typeof buttonVariants> &
  Pick<ComponentProps<T>, "class">;

const Button = <T extends ValidComponent = "button">(_: ButtonProps<T>) => {
  const rest = omit(_ as ButtonProps, "variant", "size", "class");
  return <Button_ class={cn(buttonVariants({ size: _.size, variant: _.variant }), _.class)} data-slot="button" {...rest} />;
};

export { Button, type ButtonProps, buttonVariants };
