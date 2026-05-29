import { Link } from "@tanstack/solid-router";
// import { useStore } from "@tanstack/solid-store";
// import { Image } from "@unpic/react";
// import { cva } from "class-variance-authority";
// import { motion, type Transition, useMotionValueEvent, useScroll } from "motion/react";
// import { type PropsWithChildren, useCallback } from "react";
// import type { ReadRootLayoutProps } from "@/functions/layouts";
// import { setHeaderHoveredId, setIsScrolled, store } from "@/lib/store";
import { Burger } from "./-header.burger";

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
const defaultTransition: Transition = { type: "spring", stiffness: 200, damping: 50 };
export const HEADER_T = { base: defaultTransition, content: defaultTransition, logoContent: defaultTransition };

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Header({ logoImg, navs, socials }: HeaderProps) {
  const { scrollY } = useScroll();
  const isScrolled = useStore(store, (state) => state.isScrolled);

  useMotionValueEvent(scrollY, "change", (latest) => setIsScrolled(latest > 1));

  const handleOnMouseLeave = useCallback(() => setHeaderHoveredId(), []);

  return (
    <motion.header class={HEADER.base({ isScrolled })} layoutRoot transition={HEADER_T.base}>
      <motion.div class={HEADER.content({ isScrolled })} layout onMouseLeave={handleOnMouseLeave} transition={HEADER_T.content}>
        <Link to="/">
          <HeaderLogo>
            <Image
              {...logoImg}
              background="transparent"
              breakpoints={[80, 96, 160, 192, 320]}
              sizes="(min-width: 768px) 160px, (min-width: 640px) 96px, 80px"
            />
          </HeaderLogo>
        </Link>
        <div class={HEADER.navs()}>
          {navs.map((nav) => (
            <Link {...nav} key={nav.key}>
              {({ isActive }) => <HeaderNav isActive={isActive} nav={nav} />}
            </Link>
          ))}
        </div>
        <div class={HEADER.icons()}>
          <div class={HEADER.socials()}>
            {socials.map((social) => (
              <HeaderSocial key={social.key} social={social} />
            ))}
          </div>
          <Burger navs={navs} />
        </div>
      </motion.div>
    </motion.header>
  );
}
export type HeaderProps = ReadRootLayoutProps;

// LOGO ------------------------------------------------------------------------------------------------------------------------------------
export function HeaderLogo({ children }: HeaderLogoProps) {
  const isScrolled = useStore(store, (state) => state.isScrolled);

  return (
    <button class={HEADER.logo()} type="button">
      <motion.div class={HEADER.logoContent({ isScrolled })} layout transition={HEADER_T.logoContent}>
        {children}
      </motion.div>
    </button>
  );
}
export type HeaderLogoProps = PropsWithChildren;

// NAV -------------------------------------------------------------------------------------------------------------------------------------
export function HeaderNav({ isActive, nav }: HeaderNavProps) {
  const { key, text } = nav;
  const isVisible = useStore(store, ({ headerHoveredId }) => headerHoveredId === key || (!headerHoveredId && isActive));

  const handleOnMouseEnter = useCallback(() => setHeaderHoveredId(key), [key]);

  return (
    <button class={HEADER.nav()} onMouseEnter={handleOnMouseEnter} type="button">
      {isVisible ? <motion.div class={HEADER.stain()} layoutId="hovered" /> : null}
      <span class={HEADER.stainContent()}>{text}</span>
    </button>
  );
}
export type HeaderNavProps = { isActive: boolean; nav: HeaderProps["navs"][number] };

// SOCIAL ----------------------------------------------------------------------------------------------------------------------------------
export function HeaderSocial({ social }: HeaderSocialProps) {
  const { href, icon, key, text } = social;
  const isHovered = useStore(store, ({ headerHoveredId }) => headerHoveredId === key);

  const handleOnMouseEnter = useCallback(() => setHeaderHoveredId(key), [key]);

  return (
    <a aria-label={text} class={HEADER.social()} href={href} key={key} onMouseEnter={handleOnMouseEnter}>
      {isHovered ? <motion.div class={HEADER.stain({ intent: "primary" })} layoutId="hovered" /> : null}
      <span class={HEADER.stainContent()}>
        <span class={HEADER.icon({ className: icon })} />
      </span>
    </a>
  );
}
export type HeaderSocialProps = { social: HeaderProps["socials"][number] };
