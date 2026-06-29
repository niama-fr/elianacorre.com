import type { ReadRootLayoutProps } from "@ec/domain/helpers/layouts";
import { Button } from "@ec/ui/components/button";
import { Image } from "@ec/ui/components/image";
import { Popover, PopoverContent, PopoverTrigger } from "@ec/ui/components/popover";
import { Link, useLocation } from "@tanstack/react-router";
import type { Store } from "@tanstack/react-store";
import { cva } from "class-variance-authority";
import { useEffect, useMemo, useRef, useState } from "react";

import { createStain, Stain, type StainActions, type StainState } from "./-header.stain";

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
  burgerIconBar1: cva(`origin-center -translate-y-1.75 transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] 
    group-aria-expanded/burger:translate-x-0 group-aria-expanded/burger:translate-y-0 group-aria-expanded/burger:rotate-315`),
  burgerIconBar2: cva("origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded/burger:rotate-45"),
  burgerIconBar3: cva(`origin-center translate-y-1.75 transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] 
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
export function Header({ logoImg, navs, socials }: HeaderProps) {
  const { hash, pathname } = useLocation({ select: (l) => ({ hash: l.hash, pathname: l.pathname }) });
  const stain = createStain();
  const [burgerOpen, setBurgerOpen] = useState(false);

  const burgerRef = useRef<HTMLButtonElement>(null);

  const hideStain = () => {
    stain.actions.update();
  };
  const showStain = (e: React.SyntheticEvent) => {
    stain.actions.update(e.currentTarget as HTMLElement);
  };

  const noneActive = useMemo(() => !navs.some((nav) => nav.hash === hash && nav.to === pathname), [hash, navs, pathname]);

  useEffect(() => {
    if (noneActive) stain.actions.setOrigin();
  }, [noneActive, stain]);

  useEffect(() => {
    stain.actions.setOrigin(burgerOpen ? (burgerRef.current ?? undefined) : undefined);
  }, [burgerOpen, stain]);

  return (
    <header className={HEADER.base()}>
      <div className={HEADER.content()} onMouseLeave={hideStain}>
        <Link aria-label="Accueil" className={HEADER.logo()} to="/">
          <div className={HEADER.logoContent()}>
            <Image
              {...logoImg}
              background="transparent"
              breakpoints={[80, 96, 160, 192, 320]}
              sizes="(min-width: 768px) 160px, (min-width: 640px) 96px, 80px"
            />
          </div>
        </Link>
        <Stain stain={stain} />
        <div className={HEADER.navs()}>
          {navs.map(({ key, text, ...rest }) => (
            <Link
              {...rest}
              key={key}
              activeProps={{ className: "bg-accent rounded-full" }}
              className={HEADER.nav()}
              onFocus={showStain}
              onBlur={hideStain}
              onMouseEnter={showStain}
            >
              {({ isActive }) => <NavLinkContent isActive={isActive} stain={stain} text={text} />}
            </Link>
          ))}
        </div>
        <div className={HEADER.icons()}>
          <div className={HEADER.socials()}>
            {socials.map((social) => (
              <a
                key={social.key}
                aria-label={social.text}
                className={HEADER.social()}
                data-stain="bg-primary/40"
                href={social.href}
                onFocus={showStain}
                onBlur={hideStain}
                onMouseEnter={showStain}
              >
                <span className={HEADER.stainContent()}>
                  <span className={HEADER.icon({ className: social.icon })} />
                </span>
              </a>
            ))}
          </div>
          <Popover onOpenChange={setBurgerOpen} open={burgerOpen}>
            <PopoverTrigger className={HEADER.burger()} onFocus={showStain} onBlur={hideStain} onMouseEnter={showStain} ref={burgerRef}>
              <span className={HEADER.stainContent()}>
                <svg
                  className={HEADER.burgerIcon()}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Menu</title>
                  <path className={HEADER.burgerIconBar1()} d="M4 12L20 12" />
                  <path className={HEADER.burgerIconBar2()} d="M4 12H20" />
                  <path className={HEADER.burgerIconBar3()} d="M4 12H20" />
                </svg>
              </span>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              alignOffset={14}
              // onCloseAutoFocus={(e) => {
              //   e.preventDefault();
              // }}
            >
              <nav className={HEADER.burgerNav()}>
                {navs.map(({ key, text, ...nav }) => (
                  <Button
                    key={key}
                    className="px-0"
                    onClick={() => {
                      setBurgerOpen(false);
                    }}
                    variant="ghost"
                  >
                    <Link {...nav} className="flex h-full w-full items-center justify-center font-bold">
                      {text}
                    </Link>
                  </Button>
                ))}
              </nav>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
export type HeaderProps = ReadRootLayoutProps;

// LINK CONTENT ----------------------------------------------------------------------------------------------------------------------------
export function NavLinkContent(props: NavLinkContentProps) {
  const { isActive = false, stain, text } = props;

  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isActive) stain.actions.setOrigin(ref.current?.parentElement ?? undefined);
  }, [isActive, stain.actions]);

  return (
    <span className={HEADER.stainContent()} ref={ref}>
      {text}
    </span>
  );
}
export type NavLinkContentProps = { isActive?: boolean; stain: Store<StainState, StainActions>; text: string };
