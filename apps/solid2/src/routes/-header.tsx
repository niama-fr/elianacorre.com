import type { ReadRootLayoutProps } from "@ec/domain/layouts";
import { Image } from "@ec/unpic-solid2";
import { Link, useLocation } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";
import { type Accessor, createEffect, For, onSettled } from "solid-js";

import { createStain, Stain } from "./-header.stain";

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
  stainContent: cva("relative z-10"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Header(_: HeaderProps) {
  const location = useLocation({ select: ({ hash, pathname }) => ({ hash, pathname }) });
  const stain = createStain();

  createEffect(
    () => !_.data().navs.some(({ hash = "", to }) => hash === location().hash && to === location().pathname),
    (noneActive) => {
      if (noneActive) stain.setOrigin();
    }
  );

  return (
    <header class={HEADER.base()}>
      <div class={HEADER.content()} onMouseLeave={() => stain.update()}>
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
            {({ key: _key, text, ...rest }) => (
              <Link
                {...rest}
                activeProps={{ class: "bg-accent rounded-full" }}
                class={HEADER.nav()}
                onFocusIn={(e) => stain.update(e.currentTarget)}
                onFocusOut={() => stain.update()}
                onMouseEnter={(e) => stain.update(e.currentTarget)}
              >
                {({ isActive }) => <NavLinkContent isActive={isActive} setOrigin={stain.setOrigin} text={text} />}
              </Link>
            )}
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
                  onFocusIn={(e) => stain.update(e.currentTarget)}
                  onFocusOut={() => stain.update()}
                  onMouseEnter={(e) => stain.update(e.currentTarget)}
                >
                  <span class={HEADER.stainContent()}>
                    <span class={HEADER.icon({ className: social.icon })} />
                  </span>
                </a>
              )}
            </For>
          </div>
          {/* <Burger navs={navs} /> */}
        </div>
      </div>
    </header>
  );
}
export type HeaderProps = { data: Accessor<ReadRootLayoutProps> };

// LINK CONTENT ----------------------------------------------------------------------------------------------------------------------------
export function NavLinkContent(_: NavLinkContentProps) {
  // Solid assigns this ref through JSX at runtime.
  // oxlint-disable-next-line no-unassigned-vars
  let ref!: HTMLSpanElement;

  onSettled(() => {
    if (_.isActive) _.setOrigin(ref.parentElement ?? undefined);
  });

  return (
    <span class={HEADER.stainContent()} ref={ref}>
      {_.text}
    </span>
  );
}
export type NavLinkContentProps = { isActive?: boolean; setOrigin: (el?: HTMLElement) => void; text: string };
