import { Image, type ImageProps } from "@ec/unpic-solid2";
import { cva } from "class-variance-authority";
import { createMemo, createSignal, omit, onSettled, Show } from "solid-js";
import { cn } from "@/lib/utils";

export function ImageZoom(props: ImageZoomProps) {
  const triggerProps = omit(props, "onClick", "onKeyDown", "ref", "wrapperClass", "zoomed");

  const [phase, setPhase] = createSignal<ZoomPhase>("idle");
  const [geometry, setGeometry] = createSignal<ZoomGeometry>(DEFAULT_GEOMETRY);

  let openFrame = 0;
  let scroll: ScrollSnapshot | undefined;
  let triggerRef!: HTMLImageElement;

  const expanded = createMemo(() => phase() === "expanded");
  const mounted = createMemo(() => phase() !== "idle");
  const ratio = createMemo(() => props.aspectRatio ?? (props.width ?? 0) / (props.height ?? 1));
  const transitioning = createMemo(() => phase() === "collapsing" || expanded());
  const zoomedProps = createMemo(() => ({ ...triggerProps, ...props.zoomed, background: undefined }) as ImageProps);

  const frameStyle = createMemo(() => {
    const zoom = geometry();
    const rect = expanded() ? zoom.target : zoom.origin;

    return {
      height: `${rect.height}px`,
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
    };
  });

  const closeZoom = () => {
    if (!mounted()) return;

    const currentPhase = phase();
    window.cancelAnimationFrame(openFrame);
    if (currentPhase === "positioned") finishClose();
    else setPhase("collapsing");
  };

  const finishClose = () => {
    setPhase("idle");
    unlockScroll();
  };

  const openZoom = () => {
    if (mounted()) return;

    window.cancelAnimationFrame(openFrame);
    setGeometry(measureGeometry(triggerRef, ratio()));
    lockScroll();
    setPhase("positioned");

    openFrame = window.requestAnimationFrame(() => {
      openFrame = window.requestAnimationFrame(() => {
        setPhase("expanded");
      });
    });
  };

  const setTriggerRef = (element: HTMLImageElement) => {
    triggerRef = element;
    if (typeof props.ref === "function") props.ref(element);
  };

  onSettled(() => () => {
    window.cancelAnimationFrame(openFrame);
    unlockScroll();
  });

  const lockScroll = () => {
    scroll ??= {
      body: document.body.style.overflow,
      bodyPaddingInlineEnd: document.body.style.paddingInlineEnd,
      documentElement: document.documentElement.style.overflow,
    };

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const paddingInlineEnd = window.getComputedStyle(document.body).paddingInlineEnd;
      document.body.style.paddingInlineEnd = `calc(${paddingInlineEnd} + ${scrollbarWidth}px)`;
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  };

  const unlockScroll = () => {
    if (!scroll) return;

    document.body.style.overflow = scroll.body;
    document.body.style.paddingInlineEnd = scroll.bodyPaddingInlineEnd;
    document.documentElement.style.overflow = scroll.documentElement;
    scroll = undefined;
  };

  return (
    <>
      <Image
        {...triggerProps}
        aria-label={props.alt ? `Zoomer ${props.alt}` : "Zoomer l'image"}
        class={cn(IMAGE_ZOOM.trigger({ mounted: mounted(), transitioning: transitioning() }), props.wrapperClass, props.class)}
        onClick={() => (mounted() ? closeZoom() : openZoom())}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (mounted()) closeZoom();
          else openZoom();
        }}
        onTransitionEnd={() => {
          if (phase() === "collapsing") finishClose();
        }}
        ref={setTriggerRef}
        style={mounted() ? frameStyle() : props.style}
        tabindex={0}
      />
      <Show when={mounted()}>
        <button aria-label="Fermer l'image" class={IMAGE_ZOOM.overlay({ visible: expanded() })} onClick={closeZoom} type="button" />
        <button
          aria-label="Fermer l'image"
          class={cn(IMAGE_ZOOM.frame({ transitioning: transitioning() }), props.wrapperClass)}
          onClick={closeZoom}
          style={frameStyle()}
          type="button"
        >
          <Image {...zoomedProps()} class={cn(IMAGE_ZOOM.zoomed(), zoomedProps().class)} />
        </button>
      </Show>
    </>
  );
}

export type ImageZoomProps = ImageProps & { wrapperClass?: string; zoomed?: Partial<ImageProps> };

const IMAGE_ZOOM = {
  frame: cva("fixed z-70 cursor-zoom-out overflow-hidden border-0 bg-transparent p-0", {
    variants: {
      transitioning: {
        true: "transition-[top,left,width,height] duration-3000 ease-out will-change-[top,left,width,height]",
      },
    },
  }),
  overlay: cva("fixed inset-0 z-50 border-0 bg-background/50 p-0 opacity-0 backdrop-blur-md transition-opacity duration-3000 ease-out", {
    variants: { visible: { true: "opacity-100" } },
  }),
  trigger: cva("size-full cursor-zoom-in object-cover", {
    variants: {
      transitioning: {
        true: "transition-[top,left,width,height] duration-3000 ease-out will-change-[top,left,width,height]",
      },
      mounted: {
        true: "fixed z-60 origin-top-left cursor-zoom-out",
      },
    },
  }),
  zoomed: cva("block size-full object-cover"),
} as const;

const DEFAULT_GEOMETRY: ZoomGeometry = {
  origin: { height: 1, left: 0, top: 0, width: 1 },
  target: { height: 1, left: 0, top: 0, width: 1 },
};
const SCREEN_PADDING_PX = 20;

const measureGeometry = (image: HTMLImageElement, ratio: number): ZoomGeometry => {
  const origin = image.getBoundingClientRect();
  const target = getTargetSize(ratio);

  return {
    origin: {
      height: origin.height,
      left: origin.left,
      top: origin.top,
      width: origin.width,
    },
    target: {
      ...target,
      left: (window.innerWidth - target.width) / 2,
      top: (window.innerHeight - target.height) / 2,
    },
  };
};

const getTargetSize = (ratio: number): ZoomSize => {
  const width = Math.min(window.innerWidth - SCREEN_PADDING_PX * 2, (window.innerHeight - SCREEN_PADDING_PX * 2) * ratio);

  return {
    height: width / ratio,
    width,
  };
};

type ZoomGeometry = {
  origin: ZoomRect;
  target: ZoomRect;
};
type ZoomPhase = "collapsing" | "expanded" | "idle" | "positioned";
type ZoomRect = ZoomSize & { left: number; top: number };
type ZoomSize = { height: number; width: number };
type ScrollSnapshot = { body: string; bodyPaddingInlineEnd: string; documentElement: string };
