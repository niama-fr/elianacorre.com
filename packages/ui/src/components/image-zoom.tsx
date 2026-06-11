import { Image, type ImageProps } from "@ec/unpic-solid2";
import { cva } from "class-variance-authority";
import { createMemo, createSignal, omit, onSettled, Show } from "solid-js";
import { cn } from "@/lib/utils";

export function ImageZoom(props: ImageZoomProps) {
  const triggerProps = omit(props, "onClick", "onKeyDown", "ref", "wrapperClass", "zoomed");

  const [animating, setAnimating] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  const [open, setOpen] = createSignal(false);
  const [zoom, setZoom] = createSignal<ZoomGeometry>(DEFAULT_ZOOM);

  let closeTimeout = Number.NaN;
  let overflow: ScrollOverflow | undefined;
  let openFrame = Number.NaN;
  let triggerRef!: HTMLImageElement;

  const ratio = createMemo(() => props.aspectRatio ?? (props.width ?? 0) / (props.height ?? 1));
  const zoomedProps = createMemo(() => ({ ...triggerProps, ...props.zoomed, background: undefined }) as ImageProps);

  const frameStyle = createMemo(() => {
    const geometry = zoom();
    const rect = expanded() ? geometry.target : geometry.from;

    return {
      height: `${rect.height}px`,
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
    };
  });

  const closeZoom = () => {
    if (!open()) return;

    window.cancelAnimationFrame(openFrame);
    window.clearTimeout(closeTimeout);
    setAnimating(true);
    setExpanded(false);
    closeTimeout = window.setTimeout(finishClose, ZOOM_DURATION_MS);
  };

  const finishClose = () => {
    window.clearTimeout(closeTimeout);
    setAnimating(false);
    setExpanded(false);
    setOpen(false);
    unlockScroll();
  };

  const openZoom = () => {
    if (open()) return;

    window.cancelAnimationFrame(openFrame);
    window.clearTimeout(closeTimeout);
    setZoom(getZoomGeometry(triggerRef, ratio()));
    setAnimating(false);
    setExpanded(false);
    lockScroll();
    setOpen(true);

    openFrame = window.requestAnimationFrame(() => {
      openFrame = window.requestAnimationFrame(() => {
        setAnimating(true);
        setExpanded(true);
      });
    });
  };

  const setTriggerRef = (element: HTMLImageElement) => {
    triggerRef = element;
    if (typeof props.ref === "function") props.ref(element);
  };

  onSettled(() => () => {
    window.cancelAnimationFrame(openFrame);
    window.clearTimeout(closeTimeout);
    unlockScroll();
  });

  const lockScroll = () => {
    overflow ??= {
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
    if (!overflow) return;

    document.body.style.overflow = overflow.body;
    document.body.style.paddingInlineEnd = overflow.bodyPaddingInlineEnd;
    document.documentElement.style.overflow = overflow.documentElement;
    overflow = undefined;
  };

  return (
    <>
      <Image
        {...triggerProps}
        aria-label={props.alt ? `Zoomer ${props.alt}` : "Zoomer l'image"}
        class={cn(IMAGE_ZOOM.trigger({ animating: animating(), open: open() }), props.wrapperClass, props.class)}
        onClick={() => (open() ? closeZoom() : openZoom())}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (open()) closeZoom();
          else openZoom();
        }}
        onTransitionEnd={() => {
          if (open() && !expanded()) finishClose();
        }}
        ref={setTriggerRef}
        style={open() ? frameStyle() : props.style}
        tabindex={0}
      />
      <Show when={open()}>
        <button aria-label="Fermer l'image" class={IMAGE_ZOOM.overlay({ expanded: expanded() })} onClick={closeZoom} type="button" />
        <button
          aria-label="Fermer l'image"
          class={cn(IMAGE_ZOOM.frame({ animating: animating() }), props.wrapperClass)}
          onClick={closeZoom}
          onTransitionEnd={(event) => {
            if (event.currentTarget !== event.target) return;

            if (!expanded()) finishClose();
          }}
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
      animating: {
        true: "transition-[top,left,width,height] duration-3000 ease-out will-change-[top,left,width,height]",
      },
    },
  }),
  overlay: cva("fixed inset-0 z-50 border-0 bg-background/50 p-0 opacity-0 backdrop-blur-md transition-opacity duration-3000 ease-out", {
    variants: { expanded: { true: "opacity-100" } },
  }),
  trigger: cva("size-full cursor-zoom-in object-cover", {
    variants: {
      animating: {
        true: "transition-[top,left,width,height] duration-3000 ease-out will-change-[top,left,width,height]",
      },
      open: {
        true: "fixed z-60 origin-top-left cursor-zoom-out",
      },
    },
  }),
  zoomed: cva("block size-full object-cover"),
} as const;

const DEFAULT_ZOOM: ZoomGeometry = {
  from: { height: 1, left: 0, top: 0, width: 1 },
  target: { height: 1, left: 0, top: 0, width: 1 },
};
const SCREEN_PADDING_PX = 20;
const ZOOM_DURATION_MS = 3000;

const getZoomGeometry = (image: HTMLImageElement, ratio: number): ZoomGeometry => {
  const fromRect = image.getBoundingClientRect();
  const target = getTargetSize(ratio);

  return {
    from: {
      height: fromRect.height,
      left: fromRect.left,
      top: fromRect.top,
      width: fromRect.width,
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
  from: ZoomRect;
  target: ZoomRect;
};
type ZoomRect = ZoomSize & { left: number; top: number };
type ZoomSize = { height: number; width: number };
type ScrollOverflow = { body: string; bodyPaddingInlineEnd: string; documentElement: string };
