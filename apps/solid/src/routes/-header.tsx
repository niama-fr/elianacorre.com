import { Image } from "@ec/unpic-solid2";
import { Link, useLocation } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";
import { type Accessor, createEffect, createMemo, For } from "solid-js";
import type { ReadRootLayoutProps } from "@/functions/layouts";
import { createHeaderStain, createHeaderStainTarget, HeaderStainContext, stainIdFromNav, stainIdFromSocial } from "./-header.stain";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const HEADER_TRANSITION = "duration-1000 ease-in-out motion-reduce:transition-none";
const HASH_PREFIX_RE = /^#/;

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
  stain: cva(
    `pointer-events-none absolute top-0 left-0 rounded-full
    transition-[background-color,height,opacity,transform,width] ${HEADER_TRANSITION} duration-300!`,
    {
      variants: { intent: { primary: "bg-primary/40", secondary: "bg-accent" } },
      defaultVariants: { intent: "secondary" },
    }
  ),
  stainContent: cva("relative z-10"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Header(_: HeaderProps) {
  let contentRef: HTMLDivElement | undefined;
  const logoImg = createMemo(() => _.data().logoImg);
  const navs = createMemo(() => _.data().navs);
  const socials = createMemo(() => _.data().socials);
  const location = useLocation({ select: ({ hash, pathname }) => ({ hash, pathname }) });
  const stain = createHeaderStain();
  stain.observeContainer(() => contentRef);

  createEffect(
    () => navs().find((nav) => isHeaderNavActive(nav, location())),
    (activeNav) => stain.setActive(activeNav ? stainIdFromNav(activeNav) : undefined)
  );

  return (
    <HeaderStainContext value={stain.context}>
      <header class={HEADER.base()}>
        <div
          class={HEADER.content()}
          onPointerLeave={() => stain.setHovered()}
          ref={(element) => {
            contentRef = element;
          }}
        >
          <Link aria-label="Accueil" class={HEADER.logo()} to="/">
            <div class={HEADER.logoContent()}>
              <Image
                alt={logoImg().alt}
                background="transparent"
                breakpoints={[80, 96, 160, 192, 320]}
                height={logoImg().height}
                sizes="(min-width: 768px) 160px, (min-width: 640px) 96px, 80px"
                src={logoImg().src}
                width={logoImg().width}
              />
            </div>
          </Link>
          <div aria-hidden="true" class={HEADER.stain({ intent: stain.intent() })} style={stain.style()} />
          <div class={HEADER.navs()}>
            <For each={navs()}>{(nav) => <HeaderNavLink nav={nav} />}</For>
          </div>
          <div class={HEADER.icons()}>
            <div class={HEADER.socials()}>
              <For each={socials()}>{(social) => <HeaderSocial social={social} />}</For>
            </div>
            {/* <Burger navs={navs} /> */}
          </div>
        </div>
      </header>
    </HeaderStainContext>
  );
}
export type HeaderProps = { data: Accessor<ReadRootLayoutProps> };

// NAV -------------------------------------------------------------------------------------------------------------------------------------
export function HeaderNavLink({ nav }: HeaderNavLinkProps) {
  const stainId = () => stainIdFromNav(nav);
  const hash = "hash" in nav ? nav.hash : undefined;
  const activeOptions = "activeOptions" in nav ? nav.activeOptions : undefined;
  const stain = createHeaderStainTarget<HTMLAnchorElement>(stainId);

  return (
    <Link activeOptions={activeOptions} class={HEADER.nav()} hash={hash} to={nav.to} {...stain}>
      <span class={HEADER.stainContent()}>{nav.text}</span>
    </Link>
  );
}
export type HeaderNavLinkProps = { nav: ReturnType<HeaderProps["data"]>["navs"][number] };

const isHeaderNavActive = (nav: HeaderNavLinkProps["nav"], location: HeaderLocation) => {
  const navHash = "hash" in nav ? nav.hash : undefined;

  if (navHash) {
    return nav.to === location.pathname && normalizeHash(navHash) === normalizeHash(location.hash);
  }

  return nav.to === location.pathname && !location.hash;
};

const normalizeHash = (hash?: string) => hash?.replace(HASH_PREFIX_RE, "") ?? "";
type HeaderLocation = { hash: string; pathname: string };

// SOCIAL ----------------------------------------------------------------------------------------------------------------------------------
export function HeaderSocial({ social }: HeaderSocialProps) {
  const stainId = () => stainIdFromSocial(social);
  const stain = createHeaderStainTarget<HTMLAnchorElement>(stainId);

  return (
    <a aria-label={social.text} class={HEADER.social()} href={social.href} {...stain}>
      <span class={HEADER.stainContent()}>
        <span class={HEADER.icon({ className: social.icon })} />
      </span>
    </a>
  );
}
export type HeaderSocialProps = { social: ReturnType<HeaderProps["data"]>["socials"][number] };
