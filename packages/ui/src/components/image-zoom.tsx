/** biome-ignore-all lint/suspicious/noUnassignedVariables: false positive solid */
import { cva } from "class-variance-authority";
import { createEffect, createMemo, createSignal, on, onCleanup, Show, splitProps } from "solid-js";
import { cn } from "../lib/utils";
import { Image, type ImageProps } from "./image";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(props: ImageZoomProps) {
  const [_, triggerProps] = splitProps(props, ["onClick", "onKeyDown", "ref", "zoomed"]);

  // REFS ----------------------------------------------------------------------------------------------------------------------------------
  let originRef!: HTMLSpanElement;
  let modalRef!: HTMLButtonElement;

  // SIGNALS -------------------------------------------------------------------------------------------------------------------------------
  const [phase, setPhase] = createSignal<"closed" | "closing" | "open" | "opening">("closed");
  const [styles, setStyles] = createSignal<{ from: ZoomRect; to: ZoomRect }>({ from: DEFAULT_RECT, to: DEFAULT_RECT });

  const isClosed = createMemo(() => phase() === "closed");
  const isClosing = createMemo(() => phase() === "closing");
  const isOpen = createMemo(() => phase() === "open");
  const isOpening = createMemo(() => phase() === "opening");
  const isTransitioning = createMemo(() => isOpen() || isClosing());
  const zoomedProps = createMemo(() => ({ ...triggerProps, ...(props.zoomed ?? {}), background: undefined }) as ImageProps);
  const ratio = createMemo(() => props.aspectRatio ?? (props.width ?? 0) / (props.height ?? 1));
  const style = createMemo(() => styleFrom(styles()[isOpen() ? "to" : "from"]));

  createEffect(
    on(
      () => isOpening(),
      (isOpening) => {
        if (!isOpening) return;
        let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setPhase("open"))));
        onCleanup(() => cancelAnimationFrame(frame));
      }
    )
  );

  createEffect(
    on(
      () => isClosed(),
      (isClosed) => {
        if (isClosed) return;

        const focused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        const scroll = lockScroll();
        const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeZoom();

        modalRef.focus({ preventScroll: true });
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", updateStyles);

        onCleanup(() => {
          window.removeEventListener("keydown", onKeyDown);
          window.removeEventListener("resize", updateStyles);
          unlockScroll(scroll);
          focused?.focus({ preventScroll: true });
        });
      }
    )
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
    updateStyles();
    setPhase("opening");
  };

  const updateStyles = () => {
    const from = originRef.getBoundingClientRect();
    const width = Math.min(window.innerWidth - SCREEN_PADDING_PX * 2, (window.innerHeight - SCREEN_PADDING_PX * 2) * ratio());
    const height = width / ratio();
    setStyles({ from, to: { width, left: (innerWidth - width) / 2, top: (innerHeight - height) / 2, height } });
  };

  // TEMPLATE ------------------------------------------------------------------------------------------------------------------------------
  return (
    <>
      <span class={IMAGE_ZOOM.origin()} ref={originRef}>
        <Image
          {...triggerProps}
          aria-label="Zoomer"
          class={cn(IMAGE_ZOOM.trigger(), props.class)}
          data-closed={isClosed() ? "" : undefined}
          data-transitioning={isTransitioning() ? "" : undefined}
          onClick={() => (isClosed() ? openZoom() : closeZoom())}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            if (isClosed()) openZoom();
            else closeZoom();
          }}
          onTransitionEnd={() => isClosing() && finishClose()}
          style={isClosed() ? undefined : style()}
          tabindex={0}
        />
      </span>
      <Show when={!isClosed()}>
        <span class={IMAGE_ZOOM.overlay()} data-open={isOpen() ? "" : undefined} />
        <button aria-label="Fermer" class={IMAGE_ZOOM.modal()} onClick={closeZoom} ref={modalRef} type="button">
          <Image
            {...zoomedProps()}
            aria-hidden="true"
            class={cn(IMAGE_ZOOM.frame(), IMAGE_ZOOM.zoomed(), zoomedProps().class)}
            data-transitioning={isTransitioning() ? "" : undefined}
            style={style()}
          />
        </button>
      </Show>
    </>
  );
}
export type ImageZoomProps = ImageProps & { zoomed?: Partial<ImageProps> };

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const SCREEN_PADDING_PX = 20;
const DEFAULT_RECT = { width: 0, height: 0, left: 0, top: 0 };

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const TRANSITIONING = `data-transitioning:transition-[top,left,width,height] data-transitioning:duration-500 data-transitioning:ease-out 
data-transitioning:will-change-[top,left,width,height] data-transitioning:motion-reduce:transition-none data-transitioning:motion-reduce:will-change-auto`;

const IMAGE_ZOOM = {
  frame: cva(`fixed z-80 cursor-zoom-out overflow-hidden border-0 bg-transparent p-0 ${TRANSITIONING}`),
  modal: cva("fixed inset-0 z-70 block cursor-zoom-out border-0 bg-transparent p-0 text-left"),
  origin: cva("block size-full"),
  overlay: cva(`fixed inset-0 z-50 bg-transparent backdrop-blur-0 transition-[background-color,backdrop-filter] duration-500 ease-out
    data-open:bg-background/50 data-open:backdrop-blur-md motion-reduce:transition-none`),
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

const styleFrom = (r: ZoomRect) => ({ width: `${r.width}px`, height: `${r.height}px`, top: `${r.top}px`, left: `${r.left}px` });

const unlockScroll = (scroll: ScrollSnapshot) => {
  document.body.style.overflow = scroll.body;
  document.body.style.paddingInlineEnd = scroll.bodyPaddingInlineEnd;
  document.documentElement.style.overflow = scroll.documentElement;
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ScrollSnapshot = { body: string; bodyPaddingInlineEnd: string; documentElement: string };
type ZoomRect = { height: number; left: number; top: number; width: number };
