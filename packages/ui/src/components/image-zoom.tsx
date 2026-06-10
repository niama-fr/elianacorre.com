import { Image, type ImageProps } from "@ec/unpic-solid2";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, omit, onSettled, Show } from "solid-js";
import { Dialog, DialogContent, DialogTrigger } from "@/components/dialog";
import { cn } from "@/lib/utils";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const IMAGE_ZOOM = {
  backdrop: "absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 ease-out",
  dialog:
    "fixed inset-0 top-0 left-0 z-50 z-dialog-content h-dvh w-screen max-w-none translate-x-0 translate-y-0 cursor-zoom-out overflow-hidden bg-transparent p-0 outline-none data-[closed]:invisible data-[closed]:pointer-events-none",
  triggerImage: "size-full cursor-zoom-in object-cover",
  zoomImage: "fixed z-10 max-w-none cursor-zoom-out object-contain shadow-2xl transition-transform duration-300 ease-out",
} as const;

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(props: ImageZoomProps) {
  const triggerImageProps = omit(props, "class", "ref", "zoomImageProps");
  const inheritedZoomImageProps = omit(props, "class", "objectFit", "ref", "zoomImageProps");
  const imageRatio = createMemo(() => props.aspectRatio ?? (props.width ?? 0) / (props.height ?? 1));

  const [phase, setPhase] = createSignal<ZoomPhase>("idle");
  const [rect, setRect] = createSignal<ZoomRect | null>(null);

  let closeTimeout = Number.NaN;
  let openFrame = Number.NaN;
  let imageRef!: HTMLImageElement;

  const isDialogOpen = () => phase() !== "idle";
  const isZoomed = () => phase() === "open";
  const updateRect = () => setRect(getImageContentRect(imageRef, imageRatio()));

  const cancelOpenFrame = () => {
    window.cancelAnimationFrame(openFrame);
    openFrame = Number.NaN;
  };

  const openZoom = () => {
    if (phase() !== "idle") return;

    window.clearTimeout(closeTimeout);
    updateRect();

    cancelOpenFrame();
    setPhase("opening");
    openFrame = window.requestAnimationFrame(() => {
      openFrame = Number.NaN;
      setPhase("open");
    });
  };

  const finishClose = () => {
    window.clearTimeout(closeTimeout);
    setPhase("idle");
    setRect(null);
  };

  const closeZoom = () => {
    if (phase() === "idle") return;
    cancelOpenFrame();
    setPhase("closing");
    window.clearTimeout(closeTimeout);
    closeTimeout = window.setTimeout(finishClose, ZOOM_DURATION_MS);
  };

  onSettled(() => {
    window.addEventListener("resize", updateRect);
    return () => {
      cancelOpenFrame();
      window.clearTimeout(closeTimeout);
      window.removeEventListener("resize", updateRect);
    };
  });

  return (
    <Dialog onOpenChange={(open) => (open ? openZoom() : closeZoom())} open={isDialogOpen()}>
      <DialogTrigger
        {...triggerImageProps}
        aria-label={props.alt ? `Zoomer ${props.alt}` : "Zoomer l'image"}
        as={Image}
        class={cn(IMAGE_ZOOM.triggerImage, isDialogOpen() && "opacity-0", props.class)}
        ref={(element) => {
          imageRef = element;
          if (typeof props.ref === "function") props.ref(element);
        }}
      />
      <DialogContent class={IMAGE_ZOOM.dialog} onClick={closeZoom} showCloseButton={false}>
        <div class={cn(IMAGE_ZOOM.backdrop, isZoomed() ? "opacity-100" : "opacity-0")} />
        <Show when={rect()}>
          {(currentRect) => (
            <Image
              {...({
                ...inheritedZoomImageProps,
                ...props.zoomImageProps,
                class: cn(IMAGE_ZOOM.zoomImage, props.zoomImageProps?.class),
                loading: props.zoomImageProps?.loading ?? "eager",
              } as ImageProps)}
              onTransitionEnd={() => phase() === "closing" && finishClose()}
              style={getZoomFrameStyle(currentRect(), isZoomed())}
            />
          )}
        </Show>
      </DialogContent>
    </Dialog>
  );
}
export type ImageZoomProps = ImageProps & { zoomImageProps?: Partial<ImageProps> };

// UTILS -----------------------------------------------------------------------------------------------------------------------------------
const SCREEN_PADDING_PX = 20;
const ZOOM_DURATION_MS = 300;

const getImageContentRect = (image: HTMLImageElement, ratio: number): ZoomRect => {
  const imageRect = image.getBoundingClientRect();

  const style = window.getComputedStyle(image);
  if (style.objectFit !== "cover" && style.objectFit !== "contain") return imageRect;

  const boxRatio = imageRect.width / imageRect.height;
  const shouldMatchHeight = style.objectFit === "cover" ? boxRatio < ratio : boxRatio > ratio;
  const imageWidth = shouldMatchHeight ? imageRect.height * ratio : imageRect.width;
  const imageHeight = imageWidth / ratio;
  const [x = 0.5, y = 0.5] = style.objectPosition.split(" ").map(parsePositionValue);

  return {
    height: imageHeight,
    left: imageRect.left + (imageRect.width - imageWidth) * x,
    top: imageRect.top + (imageRect.height - imageHeight) * y,
    width: imageWidth,
  };
};

const getZoomFrameStyle = (rect: ZoomRect, zoomed: boolean): JSX.CSSProperties => {
  const scale = Math.min(
    (window.innerWidth - SCREEN_PADDING_PX * 2) / rect.width,
    (window.innerHeight - SCREEN_PADDING_PX * 2) / rect.height
  );
  const width = rect.width * scale;
  const height = rect.height * scale;
  const translateX = window.innerWidth / 2 - (rect.left + width / 2);
  const translateY = window.innerHeight / 2 - (rect.top + height / 2);

  return {
    height: `${height}px`,
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    transform: zoomed ? `translate3d(${translateX}px, ${translateY}px, 0) scale(1)` : `translate3d(0, 0, 0) scale(${1 / scale})`,
    "transform-origin": "top left",
    width: `${width}px`,
  };
};

const parsePositionValue = (value: string): number => {
  if (value === "left" || value === "top") return 0;
  if (value === "right" || value === "bottom") return 1;
  if (value === "center") return 0.5;
  if (value.endsWith("%")) return Number.parseFloat(value) / 100;
  return 0.5;
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ZoomPhase = "idle" | "opening" | "open" | "closing";
type ZoomRect = { height: number; left: number; top: number; width: number };
