import { Image, type ImageProps } from "@ec/unpic-solid2";
import { cva } from "class-variance-authority";
import { createEffect, createMemo, createSignal, omit, Show } from "solid-js";
import { cn } from "@/lib/utils";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(props: ImageZoomProps) {
  const triggerProps = omit(props, "onClick", "onKeyDown", "ref", "wrapperClass", "zoomed");

  // REFS ----------------------------------------------------------------------------------------------------------------------------------
  let originRef!: HTMLSpanElement;
  let frameRef!: HTMLButtonElement;

  const setTriggerRef = (element: HTMLImageElement) => {
    if (typeof props.ref === "function") props.ref(element);
  };

  // SIGNALS -------------------------------------------------------------------------------------------------------------------------------
  const [phase, setPhase] = createSignal<ZoomPhase>("idle");
  const [geometry, setGeometry] = createSignal<ZoomGeometry>(DEFAULT_GEOMETRY);

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

  // LIFECYCLE -----------------------------------------------------------------------------------------------------------------------------
  createEffect(
    () => phase() === "positioned",
    (isPositioned) => {
      if (!isPositioned) return;

      let frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => setPhase("expanded"));
      });

      return () => window.cancelAnimationFrame(frame);
    }
  );

  createEffect(
    () => mounted(),
    (isMounted) => {
      if (!isMounted) return;

      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      const scroll = lockScroll();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") closeZoom();
      };
      const onResize = () => setGeometry(measureGeometry(originRef, ratio()));

      frameRef.focus({ preventScroll: true });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", onResize);
        unlockScroll(scroll);
        focused?.focus({ preventScroll: true });
      };
    }
  );

  // METHODS -------------------------------------------------------------------------------------------------------------------------------
  const closeZoom = () => {
    if (!mounted()) return;

    const currentPhase = phase();
    if (currentPhase === "positioned") finishClose();
    else setPhase("collapsing");
  };

  const finishClose = () => {
    setPhase("idle");
  };

  const openZoom = () => {
    if (mounted()) return;

    setGeometry(measureGeometry(originRef, ratio()));
    setPhase("positioned");
  };

  // TEMPLATE ------------------------------------------------------------------------------------------------------------------------------
  return (
    <>
      <span
        class={cn(IMAGE_ZOOM.origin(), props.wrapperClass)}
        ref={(element) => {
          originRef = element;
        }}
      >
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
      </span>
      <Show when={mounted()}>
        <div aria-label={props.alt ? `Image agrandie: ${props.alt}` : "Image agrandie"} aria-modal="true" role="dialog">
          <button aria-label="Fermer l'image" class={IMAGE_ZOOM.overlay({ visible: expanded() })} onClick={closeZoom} type="button" />
          <button
            aria-label="Fermer l'image"
            class={cn(IMAGE_ZOOM.frame({ transitioning: transitioning() }), props.wrapperClass)}
            onClick={closeZoom}
            ref={(element) => {
              frameRef = element;
            }}
            style={frameStyle()}
            type="button"
          >
            <Image {...zoomedProps()} aria-hidden="true" class={cn(IMAGE_ZOOM.zoomed(), zoomedProps().class)} />
          </button>
        </div>
      </Show>
    </>
  );
}
export type ImageZoomProps = ImageProps & { wrapperClass?: string; zoomed?: Partial<ImageProps> };

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const DEFAULT_GEOMETRY: ZoomGeometry = {
  origin: { height: 1, left: 0, top: 0, width: 1 },
  target: { height: 1, left: 0, top: 0, width: 1 },
};
const SCREEN_PADDING_PX = 20;

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const GEOMETRY_TRANSITION =
  "transition-[top,left,width,height] duration-3000 ease-out will-change-[top,left,width,height] motion-reduce:transition-none motion-reduce:will-change-auto";
const OVERLAY_TRANSITION = "transition-opacity duration-3000 ease-out motion-reduce:transition-none";

const IMAGE_ZOOM = {
  frame: cva("fixed z-70 cursor-zoom-out overflow-hidden border-0 bg-transparent p-0", {
    variants: {
      transitioning: {
        true: GEOMETRY_TRANSITION,
      },
    },
  }),
  overlay: cva(cn("fixed inset-0 z-50 border-0 bg-background/50 p-0 opacity-0 backdrop-blur-md", OVERLAY_TRANSITION), {
    variants: { visible: { true: "opacity-100" } },
  }),
  origin: cva("block size-full"),
  trigger: cva("size-full cursor-zoom-in object-cover", {
    variants: {
      transitioning: {
        true: GEOMETRY_TRANSITION,
      },
      mounted: {
        true: "fixed z-60 origin-top-left cursor-zoom-out",
      },
    },
  }),
  zoomed: cva("block size-full object-cover"),
} as const;

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
const measureGeometry = (image: HTMLElement, ratio: number): ZoomGeometry => {
  const origin = image.getBoundingClientRect();

  return {
    origin: {
      height: origin.height,
      left: origin.left,
      top: origin.top,
      width: origin.width,
    },
    target: getTargetRect(ratio),
  };
};

const getTargetRect = (ratio: number): ZoomRect => {
  const width = Math.min(window.innerWidth - SCREEN_PADDING_PX * 2, (window.innerHeight - SCREEN_PADDING_PX * 2) * ratio);
  const height = width / ratio;

  return {
    height,
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
  };
};

const lockScroll = (): ScrollSnapshot => {
  const scroll = {
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

  return scroll;
};

const unlockScroll = (scroll: ScrollSnapshot) => {
  document.body.style.overflow = scroll.body;
  document.body.style.paddingInlineEnd = scroll.bodyPaddingInlineEnd;
  document.documentElement.style.overflow = scroll.documentElement;
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ZoomGeometry = {
  origin: ZoomRect;
  target: ZoomRect;
};
type ZoomPhase = "collapsing" | "expanded" | "idle" | "positioned";
type ZoomRect = ZoomSize & { left: number; top: number };
type ZoomSize = { height: number; width: number };
type ScrollSnapshot = { body: string; bodyPaddingInlineEnd: string; documentElement: string };
