import type { Images } from "@ec/domain/images";
import { cn } from "@ec/ui2/lib/utils";
import { Image } from "@ec/unpic-solid2";
import type { ComponentProps } from "@solidjs/web";
import { cva } from "class-variance-authority";
import { createMemo, omit } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const HERO = {
  aside: cva(
    "relative hidden aspect-square w-full flex-none rounded-2xl border-12 border-white bg-neutral-200 shadow-2xl outline-1 outline-neutral-200 md:border-16 lg:-mr-20 lg:flex lg:w-md lg:rotate-6 lg:transition-transform lg:hover:rotate-8 xl:mr-0 xl:w-xl 2xl:w-2xl"
  ),
  base: cva(
    "container relative z-10 mx-auto flex flex-col items-center gap-8 px-4 py-8 sm:px-8 lg:flex-row lg:items-start xl:items-center"
  ),
  content: cva("text-balance text-center font-light text-lg sm:text-xl lg:text-start 2xl:text-2xl"),
  img: cva("size-full object-cover"),
  main: cva("flex flex-col items-center gap-8 lg:items-start"),
  title: cva("flex flex-col items-center font-black text-[42px] leading-none sm:text-7xl lg:items-start 2xl:text-8xl"),
  titleRow: cva("flex items-center gap-1 whitespace-nowrap text-primary"),
  titleRowContent: cva(`max-w-full overflow-hidden leading-tight transition-all delay-1000 duration-[2s] ease-linear
    starting:max-w-0`),
  titleRowCursor: cva("h-10 w-1 animate-blink rounded-sm bg-primary sm:h-16"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Hero(_: HeroProps) {
  const rest = omit(_, "children", "class", "image", "title");
  const C = createMemo(() => _.class ?? ({} as HeroClass));

  return (
    <section class={cn(HERO.base(), C().base)} {...rest}>
      <main class={cn(HERO.main(), C().main)}>
        <h1 class={cn(HERO.title(), C().title)}>
          <span>{_.title[0]}</span>
          <div class={cn(HERO.titleRow(), C().titleRow)}>
            <div class={cn(HERO.titleRowContent(), C().titleRowContent)}>{_.title[1]}</div>
            <div class={cn(HERO.titleRowCursor(), C().titleRowCursor)} />
          </div>
        </h1>
        {_.children}
      </main>
      <aside class={cn(HERO.aside(), C().aside)}>
        <Image
          alt={_.image.alt}
          aspectRatio={1}
          background={_.image.background}
          breakpoints={[406, 576, 724, 812, 1152, 1340, 1448, 1624]}
          class={cn(HERO.img())}
          operations={{ imagekit: { f: "avif" } }}
          priority={true}
          sizes="(min-width: 1536px) 724px, (min-width: 1280px) 612px, (min-width: 1024px) 406px, (min-width: 768px) 670px, (min-width: 640px) 576px, 100vw"
          src={_.image.src}
          width={_.image.width}
        />
      </aside>
    </section>
  );
}
type HeroProps = Omit<ComponentProps<"section">, "class" | "title"> & HeroStyles & { image: Images["Entity"]; title: string[] };

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export function HeroContent(_: HeroContentProps) {
  const rest = omit(_, "children", "class");

  return (
    <div class={cn(HERO.content(), _.class)} {...rest}>
      {_.children}
    </div>
  );
}
type HeroContentProps = ComponentProps<"div">;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type HeroClass = Partial<Record<keyof typeof HERO, string>>;
type HeroStyles = { class?: HeroClass };
