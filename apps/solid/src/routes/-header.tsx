// import { useStore } from "@tanstack/solid-store";

import { Image } from "@ec/unpic-solid2";
import { Link } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";
import { type Accessor, For } from "solid-js";
// import { motion, type Transition, useMotionValueEvent, useScroll } from "motion/react";
// import { type PropsWithChildren, useCallback } from "react";
import type { ReadRootLayoutProps } from "@/functions/layouts";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const HEADER_TRANSITION = "duration-1000 ease-in-out motion-reduce:transition-none";

export const HEADER = {
  base: cva(
    `fixed inset-x-0 top-0 z-50 
    group-data-scrolled/body:inset-x-4 group-data-scrolled/body:top-5
    transition-[left,right,top] ${HEADER_TRANSITION}
    md:group-data-scrolled/body:inset-x-20`
  ),
  content: cva(
    `relative mx-auto flex w-full items-center justify-between rounded-full px-4 py-2 bg-transparent
    group-data-scrolled/body:bg-white group-data-scrolled/body:shadow-header
    transition-[background-color,box-shadow] ${HEADER_TRANSITION}
    xl:container`
  ),
  icon: cva("flex size-7"),
  icons: cva("flex"),
  logo: cva("relative h-10 w-16 cursor-pointer"),
  logoContent: cva(`absolute -top-3 -left-3 w-20 
    group-data-scrolled/body:w-16
    transition-[width] ${HEADER_TRANSITION}
    sm:w-24 sm:group-data-scrolled/body:w-16 
    md:w-40 md:group-data-scrolled/body:w-16`),
  nav: cva("relative cursor-pointer px-4 py-2"),
  navs: cva(`hidden items-center justify-center gap-2 font-bold text-black 
    sm:flex`),
  social: cva("relative p-2"),
  socials: cva("flex items-center"),
  stain: cva("absolute inset-0 rounded-full", {
    variants: { intent: { primary: "bg-primary/40", secondary: "bg-accent" } },
    defaultVariants: { intent: "secondary" },
  }),
  stainContent: cva("relative z-10"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Header(_: HeaderProps) {
  // const handleOnMouseLeave = useCallback(() => setHeaderHoveredId(), []);

  return (
    <header class={HEADER.base()}>
      <div class={HEADER.content()}>
        <Link to="/">
          <button class={HEADER.logo()} type="button">
            <div class={HEADER.logoContent()}>
              <Image
                alt={_.data().logoImg.alt}
                background="transparent"
                breakpoints={[80, 96, 160, 192, 320]}
                height={_.data().logoImg.height}
                sizes="(min-width: 768px) 160px, (min-width: 640px) 96px, 80px"
                src={_.data().logoImg.src}
                width={_.data().logoImg.width}
              />
            </div>
          </button>
        </Link>
        <div aria-hidden="true" class={HEADER.stain()} />
        <div class={HEADER.navs()}>
          <For each={_.data().navs}>{(nav) => <Link {...nav}>{({ isActive }) => <HeaderNav isActive={isActive} nav={nav} />}</Link>}</For>
        </div>
        <div class={HEADER.icons()}>
          <div class={HEADER.socials()}>
            <For each={_.data().socials}>{(social) => <HeaderSocial social={social} />}</For>
          </div>
          {/* <Burger navs={navs} /> */}
        </div>
      </div>
    </header>
  );
}
export type HeaderProps = { data: Accessor<ReadRootLayoutProps> };

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
