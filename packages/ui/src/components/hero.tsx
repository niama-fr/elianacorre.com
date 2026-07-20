import type { Images } from "@ec/domain/helpers/images";
import { Image } from "@ec/ui/components/image";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const HERO = {
  aside: cva(`relative hidden aspect-square w-full flex-none rounded-2xl border-12 border-white bg-neutral-200 shadow-2xl outline-1 
  outline-neutral-200 
  md:border-16 
  lg:-mr-20 lg:flex lg:w-md lg:rotate-6 lg:transition-transform lg:hover:rotate-8 
  xl:mr-0 xl:w-xl 2xl:w-2xl`),
  base: cva(`container relative z-10 mx-auto flex flex-col items-center gap-8 px-4 py-8 
  sm:px-8 lg:flex-row lg:items-start xl:items-center`),
  content: cva(`text-balance text-center font-light text-lg flex flex-col gap-4
  data-pretty:border-dashed data-pretty:border-3 data-pretty:border-primary data-pretty:rounded-2xl data-pretty:p-6 data-pretty:bg-white 
  sm:text-xl 
  lg:text-start 
  2xl:text-2xl`),
  img: cva("size-full object-cover"),
  main: cva(`flex flex-col items-center gap-8 
  lg:items-start`),
  title: cva(`flex flex-col items-center font-black text-[42px] leading-none tracking-tight
  sm:text-7xl 
  lg:items-start 
  2xl:text-8xl`),
  titleRow: cva("flex items-center gap-1 whitespace-nowrap text-primary"),
  titleRowContent: cva(`max-w-full overflow-hidden leading-tight transition-all delay-1000 duration-[2s] ease-linear
  starting:max-w-0`),
  titleRowCursor: cva(`h-10 w-1 animate-blink rounded-sm bg-primary 
  sm:h-16`),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Hero(props: HeroProps) {
  const { children, className: C = {}, image, title, ...rest } = props;

  return (
    <section className={cn(HERO.base(), C.base)} {...rest}>
      <div className={cn(HERO.main(), C.main)}>
        <h1 className={cn(HERO.title(), C.title)}>
          <span>{title[0]}</span>
          <div className={cn(HERO.titleRow(), C.titleRow)}>
            <div className={cn(HERO.titleRowContent(), C.titleRowContent)}>{title[1]}</div>
            <div className={cn(HERO.titleRowCursor(), C.titleRowCursor)} />
          </div>
        </h1>
        {children}
      </div>
      {image && (
        <aside className={cn(HERO.aside(), C.aside)}>
          <Image
            alt={image.alt}
            aspectRatio={1}
            background={image.background}
            breakpoints={[406, 576, 724, 812, 1152, 1340, 1448, 1624]}
            className={cn(HERO.img())}
            operations={{ imagekit: { f: "avif" } }}
            priority={true}
            sizes="(min-width: 1536px) 724px, (min-width: 1280px) 612px, (min-width: 1024px) 406px, (min-width: 768px) 670px, (min-width: 640px) 576px, 100vw"
            src={image.src}
            width={image.width}
          />
        </aside>
      )}
    </section>
  );
}
export type HeroProps = Omit<React.ComponentProps<"section">, "className" | "title"> &
  HeroStyles & { image?: Images["Entity"]; title: string[] };

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export function HeroContent({ children, className, pretty = false, ...rest }: HeroContentProps) {
  return (
    <div className={cn(HERO.content(), className)} {...rest} data-pretty={pretty ? "" : undefined}>
      {children}
    </div>
  );
}
type HeroContentProps = React.ComponentProps<"div"> & { pretty?: boolean };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type HeroClass = Partial<Record<keyof typeof HERO, string>>;
type HeroStyles = { className?: HeroClass };
