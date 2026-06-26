import type { ReadRootLayoutProps } from "@ec/domain/layouts";
import { Button } from "@ec/ui/button";
import { Image } from "@ec/ui/image";
import { Popover, PopoverContent, PopoverTrigger } from "@ec/ui/popover";
import { Link, type LinkProps, useLocation } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";
import { type Accessor, createEffect, createSignal, For, mergeProps, on, onMount } from "solid-js";

import { createStain, Stain } from "./-header.stain";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const HEADER_TRANSITION = "duration-1000 ease-in-out motion-reduce:transition-none";

export const HEADER = {
  base: cva(
    `fixed inset-x-0 top-0 z-50
    group-data-scrolled/body:inset-x-4 group-data-scrolled/body:top-5
    transition-[left,right,top] ${HEADER_TRANSITION}
    lg:group-data-scrolled/body:inset-x-20`
  ),
  burger: cva("group/burger relative cursor-pointer rounded-full p-2 data-expanded:bg-accent md:hidden"),
  burgerIcon: cva("pointer-events-none size-7 fill-none stroke-2 stroke-current"),
  burgerIconBar1: cva(`origin-center translate-y-[-7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] 
    group-aria-expanded/burger:translate-x-0 group-aria-expanded/burger:translate-y-0 group-aria-expanded/burger:rotate-315`),
  burgerIconBar2: cva("origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded/burger:rotate-45"),
  burgerIconBar3: cva(`origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] 
    group-aria-expanded/burger:translate-y-0 group-aria-expanded/burger:rotate-135`),
  burgerNav: cva("flex flex-col gap-1"),
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
    lg:w-40 md:group-data-scrolled/body:w-16`),
  nav: cva("relative cursor-pointer px-4 py-2"),
  navs: cva(`hidden items-center justify-center gap-2 font-bold text-black 
    md:flex`),
  social: cva("relative p-2"),
  socials: cva("flex items-center"),
  stainContent: cva("relative z-10"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Header(_: HeaderProps) {
  const location = useLocation({ select: ({ hash, pathname }) => ({ hash, pathname }) });
  const stain = createStain();
  const [burgerOpen, setBurgerOpen] = createSignal(false);

  let burgerRef!: HTMLButtonElement;

  const hideStain = () => {
    stain.update();
  };
  const showStain = (e: Event) => {
    stain.update(e.currentTarget as HTMLElement);
  };

  createEffect(
    on(
      () => !_.data().navs.some(({ hash = "", to }) => hash === location().hash && to === location().pathname),
      (noneActive) => {
        if (noneActive) stain.setOrigin();
      }
    )
  );

  createEffect(
    on(
      () => burgerOpen(),
      (isBurgerOpen) => {
        stain.setOrigin(isBurgerOpen ? burgerRef : undefined);
        // burgerRef.
      }
    )
  );

  return (
    <header class={HEADER.base()}>
      <div class={HEADER.content()} onMouseLeave={hideStain}>
        <Link aria-label="Accueil" class={HEADER.logo()} to="/">
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
        </Link>
        <Stain stain={stain} />
        <div class={HEADER.navs()}>
          <For each={_.data().navs}>
            {({ key: _key, text, ...rest }) => {
              const linkProps = rest as unknown as Pick<LinkProps, "activeOptions" | "hash" | "to">;

              return (
                <Link
                  {...linkProps}
                  activeProps={{ class: "bg-accent rounded-full" }}
                  class={HEADER.nav()}
                  onFocusIn={showStain}
                  onFocusOut={hideStain}
                  onMouseEnter={showStain}
                >
                  {({ isActive }) => <NavLinkContent isActive={isActive} setOrigin={stain.setOrigin} text={text} />}
                </Link>
              );
            }}
          </For>
        </div>
        <div class={HEADER.icons()}>
          <div class={HEADER.socials()}>
            <For each={_.data().socials}>
              {(social) => (
                <a
                  aria-label={social.text}
                  class={HEADER.social()}
                  data-stain="bg-primary/40"
                  href={social.href}
                  onFocusIn={showStain}
                  onFocusOut={hideStain}
                  onMouseEnter={showStain}
                >
                  <span class={HEADER.stainContent()}>
                    <span class={HEADER.icon({ className: social.icon })} />
                  </span>
                </a>
              )}
            </For>
          </div>
          <Popover gutter={14} onOpenChange={setBurgerOpen} open={burgerOpen()} placement="bottom-end">
            <PopoverTrigger
              class={HEADER.burger()}
              onFocusIn={showStain}
              onFocusOut={hideStain}
              onMouseEnter={showStain}
              ref={(r) => (burgerRef = r)}
            >
              <span class={HEADER.stainContent()}>
                <svg
                  class={HEADER.burgerIcon()}
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Menu</title>
                  <path class={HEADER.burgerIconBar1()} d="M4 12L20 12" />
                  <path class={HEADER.burgerIconBar2()} d="M4 12H20" />
                  <path class={HEADER.burgerIconBar3()} d="M4 12H20" />
                </svg>
              </span>
            </PopoverTrigger>
            <PopoverContent
              onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}
            >
              <nav class={HEADER.burgerNav()}>
                <For each={_.data().navs}>
                  {(nav) => (
                    <Button class="px-0" onClick={() => setBurgerOpen(false)} variant="ghost">
                      <Link {...nav} class="flex h-full w-full items-center justify-center font-bold">
                        {nav.text}
                      </Link>
                    </Button>
                  )}
                </For>
              </nav>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
export type HeaderProps = { data: Accessor<ReadRootLayoutProps> };

// LINK CONTENT ----------------------------------------------------------------------------------------------------------------------------
export function NavLinkContent(props: NavLinkContentProps) {
  const _ = mergeProps({ isActive: false }, props);
  // Solid assigns this ref through JSX at runtime.
  // oxlint-disable-next-line no-unassigned-vars
  let ref!: HTMLSpanElement;

  onMount(() => {
    if (_.isActive) _.setOrigin(ref.parentElement ?? undefined);
  });

  return (
    <span class={HEADER.stainContent()} ref={ref}>
      {_.text}
    </span>
  );
}
export type NavLinkContentProps = { isActive?: boolean; setOrigin: (el?: HTMLElement) => void; text: string };
