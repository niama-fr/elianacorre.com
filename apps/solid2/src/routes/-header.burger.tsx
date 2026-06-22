import { useStore } from "@tanstack/react-store";
import { Link } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { For } from "solid-js";

import { Button } from "@/components/adapted/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setHeaderHoveredId, store } from "@/lib/store";

import { HEADER, type HeaderProps } from "./-header";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const BURGER = {
  base: cva("group relative cursor-pointer p-2 sm:hidden"),
  nav: cva("flex flex-col gap-1"),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function Burger({ navs }: BurgerProps) {
  const [open, setOpen] = useState(false);
  const handleOnMouseEnter = useCallback(() => setHeaderHoveredId("menu"), []);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button class={BURGER.base()} onMouseEnter={handleOnMouseEnter} type="button">
            <BurgerTrigger />
          </button>
        }
      />
      <PopoverContent align="start">
        <nav class={BURGER.nav()}>
          <For each={navs}>
            {({ key: _key, ...nav }) => (
              <Button class="px-0" onClick={() => setOpen(false)} variant="ghost">
                <Link {...nav} class="flex h-full w-full items-center justify-center font-bold">
                  {nav.text}
                </Link>
              </Button>
            )}
          </For>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
type BurgerProps = Pick<HeaderProps, "navs">;

// TRIGGER ---------------------------------------------------------------------------------------------------------------------------------
export function BurgerTrigger() {
  const isHovered = useStore(store, ({ headerHoveredId }) => headerHoveredId === "menu");

  return (
    <>
      {isHovered ? <motion.div class={HEADER.stain()} layoutId="hovered" /> : null}
      <span class={HEADER.stainContent()}>
        <svg
          class="pointer-events-none size-7 fill-none stroke-2 stroke-current"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Menu</title>
          <path
            class="origin-center -translate-y-7px transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
            d="M4 12L20 12"
          />
          <path
            class="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
            d="M4 12H20"
          />
          <path
            class="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
            d="M4 12H20"
          />
        </svg>
      </span>
    </>
  );
}
