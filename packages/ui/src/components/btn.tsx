import { cn } from "@ec/ui/lib/utils";
import { Link, type LinkProps } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";
import { type ComponentProps, createMemo, type JSX, mergeProps, splitProps } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const BTN = {
  base: cva(
    "group/button relative w-auto cursor-pointer overflow-hidden rounded-full border bg-background px-6 py-2 text-center font-semibold",
    {
      variants: {
        intent: {
          primary: "hover:border-primary",
          secondary: "hover:border-secondary",
        },
      },
      defaultVariants: {
        intent: "primary",
      },
    },
  ),
  circle: cva(
    `size-2 rounded-full transition-all duration-300 
    group-hover/button:scale-[100.8]`,
    {
      variants: {
        intent: {
          primary: "bg-primary",
          secondary: "bg-secondary",
        },
      },
      defaultVariants: {
        intent: "primary",
      },
    },
  ),
  container: cva(
    `inline-block transition-all duration-300 
    group-hover/button:opacity-0`,
    {
      variants: {
        reverse: {
          true: "group-hover/button:-translate-x-12",
          false: "group-hover/button:translate-x-12",
        },
      },
      defaultVariants: {
        reverse: false,
      },
    },
  ),
  hovered: cva(
    `absolute top-0 z-10 flex size-full items-center justify-center gap-2 opacity-0 transition-all duration-300
    group-hover/button:opacity-100`,
    {
      variants: {
        intent: {
          primary: "text-primary-foreground",
          secondary: "text-secondary-foreground",
        },
        reverse: {
          true: "translate-x-5 flex-row-reverse group-hover/button:-translate-x-8",
          false: "translate-x-12 flex-row group-hover/button:-translate-x-5",
        },
      },
      defaultVariants: {
        intent: "primary",
        reverse: false,
      },
    },
  ),
  icon: cva("size-5"),
  unhovered: cva("flex items-center gap-2"),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function Btn(props: BtnProps) {
  const [_, rest] = splitProps(props, ["children", "class", "icon", "intent", "reverse"]);
  const C = createMemo(() => _.class ?? {});

  return (
    <button class={cn(BTN.base({ intent: _.intent }), C().base)} {...rest}>
      <BtnContent class={C()} icon={_.icon} intent={_.intent} reverse={_.reverse}>
        {_.children}
      </BtnContent>
    </button>
  );
}
type BtnProps = Omit<ComponentProps<"button">, "class"> & BtnStyles & { icon?: string };

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function BtnLink(props: BtnLinkProps) {
  const [_, rest] = splitProps(props, ["children", "class", "icon", "intent", "reverse"]);
  const C = createMemo(() => _.class ?? {});

  return (
    <Link class={cn(BTN.base({ intent: _.intent }), C().base)} {...rest}>
      <BtnContent class={C()} icon={_.icon} intent={_.intent} reverse={_.reverse}>
        {_.children}
      </BtnContent>
    </Link>
  );
}
type BtnLinkProps = LinkProps & BtnStyles & { children: JSX.Element; icon?: string };

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export function BtnContent(props: BtnContentProps) {
  const _ = mergeProps({ icon: "icon-[lucide--chevron-right]" }, props);
  const C = createMemo(() => _.class ?? {});

  return (
    <>
      <div class={cn(BTN.unhovered(), C().unhovered)}>
        <div class={cn(BTN.circle({ intent: _.intent }), C().circle)} />
        <span class={cn(BTN.container({ reverse: _.reverse }), C().container)}>{_.children}</span>
      </div>
      <div class={cn(BTN.hovered({ intent: _.intent, reverse: _.reverse }), C().hovered)}>
        <span>{_.children}</span>
        <span class={cn(BTN.icon(), C().icon, _.icon)} />
      </div>
    </>
  );
}
type BtnContentProps = BtnStyles & { children: JSX.Element; icon?: string };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type BtnClass = Partial<Record<keyof typeof BTN, string>>;

type BtnVariants = {
  intent?: "primary" | "secondary";
  reverse?: boolean;
};

type BtnStyles = BtnVariants & { class?: BtnClass };
