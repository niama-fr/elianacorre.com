import { cn } from "@ec/ui/lib/utils";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { useMemo } from "react";

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
  const { children, className = {}, icon, intent, kind, reverse } = props;
  const content = useMemo(
    () => (
      <BtnContent className={className} icon={icon} intent={intent} reverse={reverse}>
        {children}
      </BtnContent>
    ),
    [className, children, icon, intent, reverse]
  );

  const baseClassName = cn(BTN.base({ intent }), className.base);

  if (kind === "link") {
    const { children: _1, className: _2, icon: _3, intent: _4, kind: _5, reverse: _6, ...rest } = props;
    return (
      <Link className={baseClassName} {...rest}>
        {content}
      </Link>
    );
  }
  if (kind === "button") {
    const { children: _1, className: _2, icon: _3, intent: _4, kind: _5, reverse: _6, ...rest } = props;
    return (
      <button className={baseClassName} {...rest}>
        {content}
      </button>
    );
  }
  if (kind === "external") {
    const { children: _1, className: _2, icon: _3, intent: _4, kind: _5, reverse: _6, ...rest } = props;
    return (
      <a className={baseClassName} {...rest}>
        {content}
      </a>
    );
  }
}

type BtnButtonProps = Omit<React.ComponentProps<"button">, "className"> & { kind: "button" };
type BtnExternalProps = Omit<React.ComponentProps<"a">, "className"> & { kind: "external" };
type BtnLinkProps = Omit<React.PropsWithChildren<LinkProps>, "className"> & { kind: "link" };
type BtnMainProps = BtnButtonProps | BtnExternalProps | BtnLinkProps;
export type BtnKind = "button" | "external" | "link";
export type BtnProps = BtnMainProps & BtnStyles & { icon?: string };

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
