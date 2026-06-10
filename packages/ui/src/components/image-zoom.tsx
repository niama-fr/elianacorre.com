import { Image, type ImageProps } from "@ec/unpic-solid2";
import { cva } from "class-variance-authority";
import { createEffect, createMemo, createSignal, omit, onSettled } from "solid-js";
import { Dialog, DialogContent, DialogTrigger } from "@/components/dialog";
import { cn } from "@/lib/utils";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const SCREEN_PADDING_PX = 20;
const ZOOM_DURATION_MS = 300;
const DEFAULT_RECT: ZoomRect = { height: 0, left: 0, top: 0, width: 0 };

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const IMAGE_ZOOM = {
  content:
    cva(`inset-0 top-0 left-0 z-50 z-dialog-content h-dvh w-screen max-w-none translate-x-0 translate-y-0 cursor-zoom-out overflow-hidden bg-transparent p-0 outline-none 
  data-closed:invisible data-closed:pointer-events-none`),
  overlay: cva("bg-background/80 starting:opacity-0 backdrop-blur-md transition-opacity duration-300 ease-out", {
    variants: { closing: { true: "opacity-0", false: "opacity-100" } },
  }),
  trigger: cva("size-full cursor-zoom-in object-cover"),
  wrapper: cva("fixed origin-top-left cursor-zoom-out overflow-hidden transition-transform duration-300 ease-out"),
  zoomed: cva("origin-top-left object-cover transition-[width,height,transform] duration-300 ease-out"),
} as const;

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(_: ImageZoomProps) {
  const triggerProps = omit(_, "class", "ref", "wrapperClass", "zoomed");

  let closeTimeout = Number.NaN;
  let openFrame = Number.NaN;

  // SIGNALS -------------------------------------------------------------------------------------------------------------------------------
  const [phase, setPhase] = createSignal<ZoomPhase>("idle");
  const [rect, setRect] = createSignal<ZoomRect>(DEFAULT_RECT);

  const zoomedProps = createMemo(
    () =>
      ({
        ..._.zoomed,
        alt: _.alt,
        aspectRatio: _.aspectRatio,
        background: _.background,
        height: _.height,
        src: _.src,
        width: _.width,
      }) as ImageProps
  );

  const ratio = createMemo(() => _.aspectRatio ?? (_.width ?? 0) / (_.height ?? 1));
  const zoom = createMemo(() => {
    const width = Math.min(window.innerWidth - SCREEN_PADDING_PX * 2, (window.innerHeight - SCREEN_PADDING_PX * 2) * ratio());
    const height = width / ratio();
    const translateX = window.innerWidth / 2 - (rect().left + width / 2);
    const translateY = window.innerHeight / 2 - (rect().top + height / 2);
    const scaleX = rect().width / width;
    const scaleY = rect().height / height;
    return {
      image: {
        height: phase() === "open" ? `${height}px` : `${rect().height}px`,
        transform: phase() === "open" ? "scale(1)" : `scale(${1 / scaleX}, ${1 / scaleY})`,
        width: phase() === "open" ? `${width}px` : `${rect().width}px`,
      },
      wrapper: {
        height: `${height}px`,
        left: `${rect().left}px`,
        top: `${rect().top}px`,
        transform:
          phase() === "open"
            ? `translate3d(${translateX}px, ${translateY}px, 0) scale(1)`
            : `translate3d(0, 0, 0) scale(${scaleX}, ${scaleY})`,
        width: `${width}px`,
      },
    };
  });

  // REFS ----------------------------------------------------------------------------------------------------------------------------------
  let triggerRef!: HTMLImageElement;
  const setTriggerRef = (el: HTMLImageElement) => {
    triggerRef = el;
    if (typeof _.ref === "function") _.ref(el);
  };

  // METHODS -------------------------------------------------------------------------------------------------------------------------------
  const closeZoom = () => {
    if (phase() === "idle") return;
    cancelAnimationFrame(openFrame);
    setPhase("closing");
    window.clearTimeout(closeTimeout);
    closeTimeout = setTimeout(() => setPhase("idle"), ZOOM_DURATION_MS);
  };

  const finishClose = () => {
    window.clearTimeout(closeTimeout);
    setPhase("idle");
  };

  const openZoom = () => {
    if (phase() !== "idle") return;
    updateRect();
    setPhase("opening");
    openFrame = requestAnimationFrame(() => setPhase("open"));
  };

  const updateRect = () => setRect(triggerRef.getBoundingClientRect());

  // LIFECYCLE -----------------------------------------------------------------------------------------------------------------------------
  createEffect(
    () => phase() === "idle",
    (isIdle) => {
      if (isIdle) return;
      window.addEventListener("resize", updateRect);
      return () => window.removeEventListener("resize", updateRect);
    }
  );

  onSettled(() => () => {
    cancelAnimationFrame(openFrame);
    window.clearTimeout(closeTimeout);
  });

  return (
    <Dialog onOpenChange={(open) => (open ? openZoom() : closeZoom())} open={phase() !== "idle"}>
      <DialogTrigger
        {...triggerProps}
        aria-label={_.alt ? `Zoomer ${_.alt}` : "Zoomer l'image"}
        as={Image}
        class={cn(IMAGE_ZOOM.trigger(), _.class)}
        ref={setTriggerRef}
      />
      <DialogContent
        class={IMAGE_ZOOM.content()}
        data-closing={phase() === "closing"}
        onClick={closeZoom}
        overlayClass={IMAGE_ZOOM.overlay({ closing: phase() === "closing" })}
        showCloseButton={false}
      >
        <div
          class={cn(IMAGE_ZOOM.wrapper(), _.wrapperClass)}
          onTransitionEnd={() => phase() === "closing" && finishClose()}
          style={zoom().wrapper}
        >
          <Image {...zoomedProps()} class={cn(IMAGE_ZOOM.zoomed(), _.zoomed?.class)} style={zoom().image} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
export type ImageZoomProps = ImageProps & { wrapperClass?: string; zoomed?: Partial<ImageProps> };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ZoomPhase = "idle" | "opening" | "open" | "closing";
type ZoomRect = { height: number; left: number; top: number; width: number };
