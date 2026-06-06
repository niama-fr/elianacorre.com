// import type { Transition } from "motion/react";
import type { Images } from "@ec/domain/images";
import { Image } from "@ec/unpic-solid2";
import type { ComponentProps } from "@solidjs/web";
import { cva } from "class-variance-authority";
import { createMemo, createSignal, merge, omit, onSettled } from "solid-js";
import { cn } from "@/lib/utils";
// import { SectionTitleEffect } from "./section.title-effect";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const SECTION = {
  base: cva("relative", {
    variants: {
      intent: {
        default: "",
        primary: "bg-primary/40",
        secondary: "bg-accent",
      },
    },
    defaultVariants: {
      intent: "default",
    },
  }),
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
    `relative hidden aspect-square w-full flex-none rounded-2xl border-[12px] border-white bg-neutral-200 shadow-2xl outline-1 outline-neutral-200 
    md:border-[16px] 
    lg:flex lg:w-md lg:transition-transform 
    xl:w-xl 
    2xl:w-2xl`,
    {
      variants: {
        reverse: {
          true: "lg:-translate-8 lg:-rotate-6 lg:hover:-rotate-8",
          false: "lg:translate-x-8 lg:-translate-y-8 lg:rotate-6 lg:hover:rotate-8",
        },
      },
      defaultVariants: {
        reverse: false,
      },
    }
  ),
  image: cva("size-full object-cover"),
  main: cva(
    `flex flex-col items-center gap-8 w-full 
    lg:items-start`,
    {
      variants: {
        intent: {
          default: "",
          primary: "bg-primary/40",
          secondary: "bg-accent",
        },
      },
      defaultVariants: {
        intent: "default",
      },
    }
  ),
  title: cva(
    `flex flex-col items-center font-extrabold text-4xl 
    sm:text-6xl 
    lg:items-start 
    2xl:text-7xl`
  ),
  titleRow: cva("relative -mr-5 w-fit pr-5"),
  titleRowEffect: cva("pointer-events-none absolute inset-0 z-0 flex items-start"),
  titleRowPointer: cva("size-5", {
    variants: {
      intent: {
        default: "text-primary",
        primary: "text-primary",
        secondary: "text-secondary",
      },
    },
    defaultVariants: {
      intent: "default",
    },
  }),
  titleRowPointerWrapper: cva("pointer-events-none -mb-5 -rotate-90 self-end opacity-100"),
  titleRowRectangle: cva("size-full starting:size-0 translate-y-1 -rotate-2 rounded-2xl transition-all duration-2000 ease-in-out", {
    variants: {
      intent: {
        default: "bg-primary",
        primary: "bg-primary",
        secondary: "bg-secondary",
      },
    },
    defaultVariants: {
      intent: "default",
    },
  }),
  titleRowText: cva("relative z-10 text-white"),
};

// TRANSITIONS -----------------------------------------------------------------------------------------------------------------------------
// export const SECTION_T = {
//   titleRowEffect: { duration: 0.5, ease: "easeOut" },
//   titleRowPointerWrapper: { opacity: { duration: 0.1, ease: "easeInOut" }, duration: 1, ease: "easeInOut" },
//   titleRowRectangle: { duration: 1, ease: "easeInOut" },
// } satisfies Record<string, Transition>;

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Section(props: SectionProps) {
  const _ = merge({ intent: "default" } as const, props);
  const rest = omit(_, "children", "class", "intent", "reverse");
  const C = createMemo(() => _.class ?? {});

  return (
    <section {...rest} class={cn(SECTION.base({ intent: _.intent }), C().base)}>
      <div class={cn(SECTION.container(), C().container)}>{_.children}</div>
    </section>
  );
}
type SectionProps = Omit<ComponentProps<"section">, "class"> & SectionVariants & { class?: Pick<SectionClass, "base" | "container"> };

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
export function SectionContent(_: SectionContentProps) {
  const rest = omit(_, "children", "class", "intent", "reverse");

  return (
    <div {...rest} class={cn(SECTION.content(), _.class)}>
      {_.children}
    </div>
  );
}
type SectionContentProps = ComponentProps<"p"> & SectionVariants;

// IMAGE -----------------------------------------------------------------------------------------------------------------------------------
export function SectionImage(props: SectionImageProps) {
  const _ = merge({ reverse: false }, props);
  const rest = omit(_, "class", "image", "intent", "reverse");
  const C = createMemo(() => _.class ?? {});

  return (
    <figure {...rest} class={cn(SECTION.figure({ reverse: _.reverse }), C().figure)}>
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
type SectionImageProps = Omit<ComponentProps<"figure">, "class"> &
  SectionVariants & {
    class?: Pick<SectionClass, "figure" | "image">;
    image: Images["Entity"];
  };

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function SectionMain(_: SectionMainProps) {
  const rest = omit(_, "children", "class", "intent", "reverse");
  return (
    <main {...rest} class={cn(SECTION.main({ intent: _.intent }), _.class)}>
      {_.children}
    </main>
  );
}
type SectionMainProps = ComponentProps<"main"> & SectionVariants;

// TITLE -----------------------------------------------------------------------------------------------------------------------------------
export function SectionTitle(props: SectionTitleProps) {
  const _ = merge({ intent: "primary" } as const, props);
  const rest = omit(_, "class", "intent", "reverse", "title");
  const C = createMemo(() => _.class ?? {});

  // biome-ignore lint/suspicious/noUnassignedVariables: false positive
  let el!: HTMLHeadingElement;

  const [visible, setVisible] = createSignal(false);

  onSettled(() => {
    const instance = new IntersectionObserver(
      () => {
        console.log(el);
        setVisible(true);
      },
      { threshold: 1 }
    );
    instance.observe(el);
    return () => instance.unobserve(el);
  });

  return (
    <h2 ref={el} {...rest} class={cn(SECTION.title(), C().title)} data-visible={visible()}>
      <span>{_.title[0]}</span>
      <SectionTitleEffect class={C()} intent={_.intent} reverse={_.reverse} text={_.title[1]} />
    </h2>
  );
}

export type SectionTitleProps = Omit<ComponentProps<"h2">, "class" | "title"> &
  SectionVariants & {
    class?: Pick<
      SectionClass,
      "title" | "titleRow" | "titleRowEffect" | "titleRowPointer" | "titleRowPointerWrapper" | "titleRowRectangle" | "titleRowText"
    >;
    title: string[];
  };

// EFFECT ----------------------------------------------------------------------------------------------------------------------------------
export function SectionTitleEffect(_: SectionTitleEffectProps) {
  const C = createMemo(() => _.class ?? {});

  // const containerRef = useRef<HTMLDivElement>(null);
  // const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // useEffect(() => {
  //   if (containerRef.current) {
  //     const { width, height } = containerRef.current.getBoundingClientRect();
  //     setDimensions({ width, height });
  //   }

  //   const resizeObserver = new ResizeObserver((entries) => {
  //     for (const entry of entries) {
  //       const { width, height } = entry.contentRect;
  //       setDimensions({ width, height });
  //     }
  //   });

  //   if (containerRef.current) resizeObserver.observe(containerRef.current);

  //   return () => {
  //     if (containerRef.current) {
  //       resizeObserver.unobserve(containerRef.current);
  //     }
  //   };
  // }, []);

  return (
    <div class={cn(SECTION.titleRow(), C().titleRow)}>
      <span class={cn(SECTION.titleRowText(), C().titleRowText)}>{_.text}</span>
      {/* {dimensions.width > 0 && dimensions.height > 0 && ( */}
      <div
        // animate={{ opacity: 1, scale: 1 }}
        class={cn(SECTION.titleRowEffect(), C().titleRowEffect)}
        // initial={{ opacity: 0, scale: 0.95, originX: 0, originY: 0 }}
        // transition={SECTION_T.titleRowEffect}
      >
        <div
          class={cn(SECTION.titleRowRectangle({ intent: _.intent }), C().titleRowRectangle)}
          // transition={SECTION_T.titleRowRectangle}
          // whileInView={dimensions}
        />
        <div
          class={cn(SECTION.titleRowPointerWrapper(), C().titleRowPointerWrapper)}
          // style={{ rotate: -90 }}
          // transition={SECTION_T.titleRowPointerWrapper}
          // whileInView={{ opacity: 1, x: dimensions.width + 4, y: dimensions.height + 4 }}
        >
          <svg
            aria-hidden="true"
            class={cn(SECTION.titleRowPointer({ intent: _.intent }), C().titleRowPointer)}
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
      {/* )} */}
    </div>
  );
}
export type SectionTitleEffectProps = SectionVariants & {
  class?: Pick<
    SectionClass,
    "titleRow" | "titleRowEffect" | "titleRowPointer" | "titleRowPointerWrapper" | "titleRowRectangle" | "titleRowText"
  >;
  text?: string;
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type SectionClass = Partial<Record<keyof typeof SECTION, string>>;

export type SectionVariants = {
  intent?: "default" | "primary" | "secondary" | null;
  reverse?: boolean | null;
};
