import { cn } from "@ec/ui/lib/utils";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const BTN = {
  base: cva(
    "group/button relative w-auto cursor-pointer overflow-hidden rounded-full border bg-background px-6 py-2 text-center font-semibold",
    {
      defaultVariants: {
        intent: "primary",
      },
      variants: {
        intent: {
          primary: "hover:border-primary",
          secondary: "hover:border-secondary",
        },
      },
    }
  ),
  circle: cva(
    `size-2 rounded-full transition-all duration-300 
    group-hover/button:scale-[100.8]`,
    {
      defaultVariants: {
        intent: "primary",
      },
      variants: {
        intent: {
          primary: "bg-primary",
          secondary: "bg-secondary",
        },
      },
    }
  ),
  container: cva(
    `inline-block transition-all duration-300 
    group-hover/button:opacity-0`,
    {
      defaultVariants: {
        reverse: false,
      },
      variants: {
        reverse: {
          false: "group-hover/button:translate-x-12",
          true: "group-hover/button:-translate-x-12",
        },
      },
    }
  ),
  hovered: cva(
    `absolute top-0 z-10 flex size-full items-center justify-center gap-2 opacity-0 transition-all duration-300
    group-hover/button:opacity-100`,
    {
      defaultVariants: {
        intent: "primary",
        reverse: false,
      },
      variants: {
        intent: {
          primary: "text-primary-foreground",
          secondary: "text-secondary-foreground",
        },
        reverse: {
          false: "translate-x-12 flex-row group-hover/button:-translate-x-5",
          true: "translate-x-5 flex-row-reverse group-hover/button:-translate-x-8",
        },
      },
    }
  ),
  icon: cva("size-5"),
  unhovered: cva("flex items-center gap-2"),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function Btn(props: BtnProps) {
  const { children, className: C = {}, icon, intent, reverse, ...rest } = props;
  return (
    <button className={cn(BTN.base({ intent }), C.base)} {...rest}>
      <BtnContent className={C} icon={icon} intent={intent} reverse={reverse}>
        {children}
      </BtnContent>
    </button>
  );
}
type BtnProps = Omit<React.ComponentProps<"button">, "className"> & BtnStyles & { icon?: string };

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function BtnLink(props: BtnLinkProps) {
  const { className: C = {}, children, icon, intent, reverse, ...rest } = props;

  return (
    <Link className={cn(BTN.base({ intent }), C.base)} {...rest}>
      <BtnContent className={C} icon={icon} intent={intent} reverse={reverse}>
        {children}
      </BtnContent>
    </Link>
  );
}
type BtnLinkProps = React.PropsWithChildren<LinkProps & BtnStyles & { icon?: string }>;

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export function BtnContent(props: BtnContentProps) {
  const { className: C = {}, children, intent = "primary", reverse = false, icon = "icon-[lucide--chevron-right]" } = props;
  return (
    <>
      <div className={cn(BTN.unhovered(), C.unhovered)}>
        <div className={cn(BTN.circle({ intent }), C.circle)} />
        <span className={cn(BTN.container({ reverse }), C.container)}>{children}</span>
      </div>
      <div className={cn(BTN.hovered({ intent, reverse }), C.hovered)}>
        <span>{children}</span>
        <span className={cn(BTN.icon(), C.icon, icon)} />
      </div>
    </>
  );
}
type BtnContentProps = React.PropsWithChildren<BtnStyles & { icon?: string }>;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------

type BtnVariants = {
  intent?: "primary" | "secondary";
  reverse?: boolean;
};

type BtnStyles = BtnVariants & { className?: Partial<Record<keyof typeof BTN, string>> };
