/** biome-ignore-all lint/suspicious/noUnassignedVariables: false positive solid */
import { Image, type ImageProps } from "@ec/unpic-solid2";
import { cva } from "class-variance-authority";
import { createEffect, createMemo, createSignal, omit, Show } from "solid-js";
import { cn } from "@/lib/utils";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(props: ImageZoomProps) {
  const triggerProps = omit(props, "onClick", "onKeyDown", "ref", "wrapperClass", "zoomed");

  // REFS ----------------------------------------------------------------------------------------------------------------------------------
  let originRef!: HTMLSpanElement;
  let modalRef!: HTMLButtonElement;

  // SIGNALS -------------------------------------------------------------------------------------------------------------------------------
  const [phase, setPhase] = createSignal<ZoomPhase>("closed");
  const [rects, setRects] = createSignal<ZoomRects>(DEFAULT_RECTS);

  const isClosed = createMemo(() => phase() === "closed");
  const isClosing = createMemo(() => phase() === "closing");
  const isOpen = createMemo(() => phase() === "open");
  const isOpening = createMemo(() => phase() === "opening");
  const isTransitioning = createMemo(() => isOpen() || isClosing());
  const ratio = createMemo(() => props.aspectRatio ?? (props.width ?? 0) / (props.height ?? 1));
  const zoomedProps = createMemo(() => ({ ...triggerProps, ...props.zoomed, background: undefined }) as ImageProps);
  const rect = createMemo(() => rects()[isOpen() ? "target" : "origin"]);
  const frameStyle = createMemo(() => `width:${rect().width}px;height:${rect().height}px;top:${rect().top}px;left:${rect().left}px`);

  // LIFECYCLE -----------------------------------------------------------------------------------------------------------------------------
  createEffect(
    () => isOpening(),
    (isOpening) => {
      if (!isOpening) return;
      let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setPhase("open"))));
      return () => cancelAnimationFrame(frame);
    }
  );

  createEffect(
    () => isClosed(),
    (isClosed) => {
      if (isClosed) return;

      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      const scroll = lockScroll();
      const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeZoom();

      modalRef.focus({ preventScroll: true });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("resize", updateRects);

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", updateRects);
        unlockScroll(scroll);
        focused?.focus({ preventScroll: true });
      };
    }
  );

  // METHODS -------------------------------------------------------------------------------------------------------------------------------
  const closeZoom = () => {
    if (isClosed()) return;
    if (isOpening()) finishClose();
    else setPhase("closing");
  };

  const finishClose = () => setPhase("closed");

  const openZoom = () => {
    if (!isClosed()) return;
    updateRects();
    setPhase("opening");
  };

  const updateRects = () => {
    const { height, left, top, width } = originRef.getBoundingClientRect();
    const w = Math.min(window.innerWidth - SCREEN_PADDING_PX * 2, (window.innerHeight - SCREEN_PADDING_PX * 2) * ratio());
    const h = w / ratio();
    setRects({
      origin: { height, left, top, width },
      target: { height: h, left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w },
    });
  };

  // TEMPLATE ------------------------------------------------------------------------------------------------------------------------------
  return (
    <>
      <span class={cn(IMAGE_ZOOM.origin(), props.wrapperClass)} ref={originRef}>
        <Image
          {...triggerProps}
          aria-label="Zoomer"
          class={cn(IMAGE_ZOOM.trigger(), props.wrapperClass, props.class)}
          data-closed={isClosed()}
          data-transitioning={isTransitioning()}
          onClick={() => (isClosed() ? openZoom() : closeZoom())}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            if (isClosed()) openZoom();
            else closeZoom();
          }}
          onTransitionEnd={() => isClosing() && finishClose()}
          style={isClosed() ? props.style : frameStyle()}
          tabindex={0}
        />
      </span>
      <Show when={!isClosed()}>
        <button aria-label="Fermer" class={IMAGE_ZOOM.modal()} data-open={isOpen()} onClick={closeZoom} ref={modalRef} type="button">
          <span class={cn(IMAGE_ZOOM.frame(), props.wrapperClass)} data-transitioning={isTransitioning()} style={frameStyle()}>
            <Image {...zoomedProps()} aria-hidden="true" class={cn(IMAGE_ZOOM.zoomed(), zoomedProps().class)} />
          </span>
        </button>
      </Show>
    </>
  );
}
export type ImageZoomProps = ImageProps & { wrapperClass?: string; zoomed?: Partial<ImageProps> };

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const DEFAULT_RECTS: ZoomRects = {
  origin: { height: 1, left: 0, top: 0, width: 1 },
  target: { height: 1, left: 0, top: 0, width: 1 },
};
const SCREEN_PADDING_PX = 20;

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const TRANSITIONING = `data-transitioning:transition-[top,left,width,height] data-transitioning:duration-3000 data-transitioning:ease-out 
data-transitioning:will-change-[top,left,width,height] data-transitioning:motion-reduce:transition-none data-transitioning:motion-reduce:will-change-auto`;

const IMAGE_ZOOM = {
  frame: cva(`fixed z-70 cursor-zoom-out overflow-hidden border-0 bg-transparent p-0 ${TRANSITIONING}`),
  modal:
    cva(`fixed inset-0 z-50 block cursor-zoom-out border-0 bg-transparent p-0 text-left backdrop-blur-0 transition-[background-color,backdrop-filter] duration-3000 ease-out
    data-open:bg-background/50 data-open:backdrop-blur-md motion-reduce:transition-none`),
  origin: cva("block size-full"),
  trigger: cva(`size-full cursor-zoom-in object-cover ${TRANSITIONING}
    [&:not([data-closed])]:fixed [&:not([data-closed])]:z-60 [&:not([data-closed])]:origin-top-left [&:not([data-closed])]:cursor-zoom-out`),
  zoomed: cva("block size-full object-cover"),
} as const;

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
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
type ScrollSnapshot = { body: string; bodyPaddingInlineEnd: string; documentElement: string };
type ZoomPhase = "closed" | "closing" | "open" | "opening";
type ZoomRect = { height: number; left: number; top: number; width: number };
type ZoomRects = { origin: ZoomRect; target: ZoomRect };
