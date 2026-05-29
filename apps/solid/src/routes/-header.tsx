import type { ComponentProps } from "@solidjs/web";
import { Link } from "@tanstack/solid-router";
// import { useStore } from "@tanstack/solid-store";
// import { Image } from "@unpic/react";
import { cva } from "class-variance-authority";
import { type Accessor, For } from "solid-js";
// import { motion, type Transition, useMotionValueEvent, useScroll } from "motion/react";
// import { type PropsWithChildren, useCallback } from "react";
import type { ReadRootLayoutProps } from "@/functions/layouts";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const HEADER = {
  base: cva("fixed z-50", { variants: { isScrolled: { false: "inset-x-0 top-0", true: "inset-x-4 top-5 md:inset-x-20" } } }),
  content: cva(
    `relative mx-auto flex w-full items-center justify-between rounded-full px-4 py-2 
    transition-[box-shadow,background-color] duration-1000
    xl:container`,
    { variants: { isScrolled: { false: "bg-transparent", true: "bg-white shadow-header" } } }
  ),
  icon: cva("flex size-7"),
  icons: cva("flex"),
  logo: cva("relative h-10 w-16 cursor-pointer"),
  logoContent: cva("absolute -top-3 -left-3", {
    variants: { isScrolled: { false: "w-20 sm:w-24 md:w-40", true: "w-16 sm:w-16 md:w-16" } },
  }),
  nav: cva("relative cursor-pointer px-4 py-2"),
  navs: cva(`hidden items-center justify-center gap-2 font-bold text-black 
    sm:flex`),
  social: cva("relative p-2"),
  socials: cva("flex items-center"),
  stain: cva("absolute inset-0 size-full rounded-full", {
    variants: { intent: { primary: "bg-primary/40", secondary: "bg-accent" } },
    defaultVariants: { intent: "secondary" },
  }),
  stainContent: cva("relative z-10"),
};

// TRANSITIONS -----------------------------------------------------------------------------------------------------------------------------
// const defaultTransition: Transition = { type: "spring", stiffness: 200, damping: 50 };
// export const HEADER_T = { base: defaultTransition, content: defaultTransition, logoContent: defaultTransition };

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Header(_: HeaderProps) {
  // const { scrollY } = useScroll();
  // const isScrolled = useStore(store, (state) => state.isScrolled);

  // useMotionValueEvent(scrollY, "change", (latest) => setIsScrolled(latest > 1));

  // const handleOnMouseLeave = useCallback(() => setHeaderHoveredId(), []);

  return (
    <header class={HEADER.base()}>
      <div class={HEADER.content()}>
        <Link to="/">
          <HeaderLogo>
            {/* <Image
              {...logoImg}
              background="transparent"
              breakpoints={[80, 96, 160, 192, 320]}
              sizes="(min-width: 768px) 160px, (min-width: 640px) 96px, 80px"
            />  */}
          </HeaderLogo>
        </Link>
        <div class={HEADER.navs()}>
          <For each={_.data().navs}>{(nav) => <Link {...nav}>{({ isActive }) => <HeaderNav isActive={isActive} nav={nav} />}</Link>}</For>
          {/* {navs.map((nav) => (
            <Link {...nav} key={nav.key}>
              {({ isActive }) => <HeaderNav isActive={isActive} nav={nav} />}
            </Link>
          ))} */}
        </div>
        <div class={HEADER.icons()}>
          <div class={HEADER.socials()}>
            <For each={_.data().socials}>{(social) => <HeaderSocial social={social} />}</For>
            {/* {socials.map((social) => (
              <HeaderSocial key={social.key} social={social} />
            ))} */}
          </div>
          {/* <Burger navs={navs} /> */}
        </div>
      </div>
    </header>
  );
}
export type HeaderProps = { data: Accessor<ReadRootLayoutProps> };

// LOGO ------------------------------------------------------------------------------------------------------------------------------------
export function HeaderLogo({ children }: HeaderLogoProps) {
  // const isScrolled = useStore(store, (state) => state.isScrolled);

  return (
    <button class={HEADER.logo()} type="button">
      <div class={HEADER.logoContent()}>{children}</div>
    </button>
  );
}
export type HeaderLogoProps = ComponentProps<"button">;

// NAV -------------------------------------------------------------------------------------------------------------------------------------
export function HeaderNav(_: HeaderNavProps) {
  // const { key, text } = nav;
  // const isVisible = useStore(store, ({ headerHoveredId }) => headerHoveredId === key || (!headerHoveredId && isActive));

  // const handleOnMouseEnter = useCallback(() => setHeaderHoveredId(key), [key]);

  return (
    <button class={HEADER.nav()} type="button">
      {/* {isVisible ? <div class={HEADER.stain()} /> : null} */}
      <span class={HEADER.stainContent()}>{_.nav.text}</span>
    </button>
  );
}
export type HeaderNavProps = { isActive: boolean; nav: ReturnType<HeaderProps["data"]>["navs"][number] };

// SOCIAL ----------------------------------------------------------------------------------------------------------------------------------
export function HeaderSocial(_: HeaderSocialProps) {
  // const { href, icon, text } = social;
  // const isHovered = useStore(store, ({ headerHoveredId }) => headerHoveredId === key);

  // const handleOnMouseEnter = useCallback(() => setHeaderHoveredId(key), [key]);

  return (
    <a aria-label={_.social.text} class={HEADER.social()} href={_.social.href}>
      {/* {isHovered ? <div class={HEADER.stain({ intent: "primary" })} /> : null} */}
      <span class={HEADER.stainContent()}>
        <span class={HEADER.icon({ className: _.social.icon })} />
      </span>
    </a>
  );
}
export type HeaderSocialProps = { social: ReturnType<HeaderProps["data"]>["socials"][number] };
