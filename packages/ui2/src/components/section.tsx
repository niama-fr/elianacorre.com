import type { Images } from "@ec/domain/images";
import { cn } from "@ec/ui2/lib/utils";
import { Image } from "@ec/unpic-solid2";
import type { ComponentProps } from "@solidjs/web";
import { cva } from "class-variance-authority";
import { createMemo, createSignal, merge, omit, onSettled } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const SECTION = {
  base: cva("group/section relative data-[intent=primary]:bg-primary/40 data-[intent=secondary]:bg-accent"),
  container: cva(
    `container mx-auto flex flex-col items-center gap-8 px-4 py-8 
    sm:px-8 
    lg:flex-row lg:items-start`
  ),
  content: cva(
    `flex flex-col gap-8 text-balance text-center font-light 
    sm:text-lg 
    lg:text-start 
    2xl:text-xl`
  ),
  figure: cva(
    `relative hidden aspect-square w-full flex-none rounded-2xl border-12 border-white bg-neutral-200 shadow-2xl outline-1 outline-neutral-200
    group-data-reverse/section:lg:-translate-8 group-data-reverse/section:lg:-rotate-6 group-data-reverse/section:lg:hover:-rotate-8
    md:border-[16px] 
    lg:flex lg:w-md lg:translate-x-8 lg:-translate-y-8 lg:rotate-6 lg:hover:rotate-8 lg:transition-transform 
    xl:w-xl 
    2xl:w-2xl`
  ),
  image: cva("size-full object-cover"),
  main: cva(
    `flex flex-col items-center gap-8 w-full
    lg:items-start`
  ),
  title: cva(
    `group/title flex flex-col items-center font-extrabold text-4xl 
    sm:text-6xl 
    lg:items-start 
    2xl:text-7xl`
  ),
  titleRow: cva("relative -mr-5 w-fit pr-5"),
  titleRowEffect: cva(`pointer-events-none absolute inset-0 z-0 flex items-start opacity-0 scale-95 
    transition duration-500 ease-out origin-top-left
    group-data-visible/title:opacity-100 group-data-visible/title:scale-100`),
  titleRowPointer: cva("size-5 text-primary group-data-[intent=secondary]/section:text-secondary"),
  titleRowPointerWrapper: cva("pointer-events-none -mb-5 -rotate-90 self-end opacity-100 duration-1000 ease-in-out"),
  titleRowRectangle: cva(
    `size-0 translate-y-1 -rotate-2 rounded-2xl bg-primary group-data-[intent=secondary]/section:bg-secondary
    group-data-visible/title:size-full
    transition-all duration-2000 ease-in-out`
  ),
  titleRowText: cva("relative z-10 text-white"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Section(props: SectionProps) {
  const _ = merge({ intent: "default" } as const, props);
  const rest = omit(_, "children", "class", "intent", "reverse");
  const C = createMemo(() => _.class ?? {});

  return (
    <section {...rest} class={cn(SECTION.base(), C().base)} data-intent={_.intent} data-reverse={_.reverse}>
      <div class={cn(SECTION.container(), C().container)}>{_.children}</div>
    </section>
  );
}
type SectionProps = Omit<ComponentProps<"section">, "class"> & SectionVariants & { class?: Pick<SectionClass, "base" | "container"> };

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export function SectionContent(_: SectionContentProps) {
  const rest = omit(_, "children", "class");

  return (
    <div {...rest} class={cn(SECTION.content(), _.class)}>
      {_.children}
    </div>
  );
}
type SectionContentProps = ComponentProps<"p">;

// IMAGE -----------------------------------------------------------------------------------------------------------------------------------
export function SectionImage(props: SectionImageProps) {
  const _ = merge({ reverse: false }, props);
  const rest = omit(_, "class", "image");
  const C = createMemo(() => _.class ?? {});

  return (
    <figure {...rest} class={cn(SECTION.figure(), C().figure)}>
      <Image
        alt={_.image.alt}
        aspectRatio={1}
        background={_.image.background}
        class={cn(SECTION.image(), C().image)}
        operations={{ imagekit: { f: "avif" } }}
        sizes="(min-width: 1536px) 724px, (min-width: 1280px) 612px, (min-width: 1024px) 406px, (min-width: 768px) 670px, (min-width: 640px) 576px, 100vw"
        src={_.image.src}
        width={_.image.width}
      />
    </figure>
  );
}
type SectionImageProps = Omit<ComponentProps<"figure">, "class"> & {
  class?: Pick<SectionClass, "figure" | "image">;
  image: Images["Entity"];
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function SectionMain(_: SectionMainProps) {
  const rest = omit(_, "children", "class");
  return (
    <main {...rest} class={cn(SECTION.main(), _.class)}>
      {_.children}
    </main>
  );
}
type SectionMainProps = ComponentProps<"main">;

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export function SectionTitle(_: SectionTitleProps) {
  const rest = omit(_, "class", "title");
  const C = createMemo(() => _.class ?? {});

  // biome-ignore lint/suspicious/noUnassignedVariables: false positive
  let el!: HTMLHeadingElement;

  const [visible, setVisible] = createSignal(false);

  onSettled(() => {
    const instance = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        instance.disconnect();
      },
      { threshold: 1 }
    );
    instance.observe(el);
    return () => instance.disconnect();
  });

  return (
    <h2 ref={el} {...rest} class={cn(SECTION.title(), C().title)} data-visible={visible()}>
      <span>{_.title[0]}</span>
      <div class={cn(SECTION.titleRow(), C().titleRow)}>
        <span class={cn(SECTION.titleRowText(), C().titleRowText)}>{_.title[1]}</span>
        <div class={cn(SECTION.titleRowEffect(), C().titleRowEffect)}>
          <div class={cn(SECTION.titleRowRectangle(), C().titleRowRectangle)} />
          <div class={cn(SECTION.titleRowPointerWrapper(), C().titleRowPointerWrapper)}>
            <svg
              aria-hidden="true"
              class={cn(SECTION.titleRowPointer(), C().titleRowPointer)}
              fill="currentColor"
              height="1em"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
              viewBox="0 0 16 16"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
            </svg>
          </div>
        </div>
      </div>
    </h2>
  );
}

export type SectionTitleProps = Omit<ComponentProps<"h2">, "class" | "title"> & {
  class?: Pick<
    SectionClass,
    "title" | "titleRow" | "titleRowEffect" | "titleRowPointer" | "titleRowPointerWrapper" | "titleRowRectangle" | "titleRowText"
  >;
  title: string[];
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type SectionClass = Partial<Record<keyof typeof SECTION, string>>;

export type SectionVariants = {
  intent?: "default" | "primary" | "secondary" | null;
  reverse?: boolean | null;
};
