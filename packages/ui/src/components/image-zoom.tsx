import { Image, type ImageProps } from "@ec/unpic-solid2";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, omit, onSettled, Show } from "solid-js";
import { Dialog, DialogContent, DialogTrigger } from "@/components/dialog";
import { cn } from "@/lib/utils";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const IMAGE_ZOOM = {
  backdrop: "absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 ease-out",
  dialog:
    "fixed inset-0 top-0 left-0 z-50 z-dialog-content h-dvh w-screen max-w-none translate-x-0 translate-y-0 cursor-zoom-out overflow-hidden bg-transparent p-0 outline-none",
  triggerImage: "size-full cursor-zoom-in object-cover",
  zoomImage: "fixed z-10 max-w-none cursor-zoom-out object-contain shadow-2xl transition-transform duration-300 ease-out",
} as const;

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(props: ImageZoomProps) {
  const triggerImageProps = omit(props, "class", "ref", "zoomImageProps");
  const inheritedZoomImageProps = omit(props, "class", "objectFit", "ref", "zoomImageProps");

  const [phase, setPhase] = createSignal<ZoomPhase>("idle");
  const [rect, setRect] = createSignal<ZoomRect | null>(null);

  let closeTimeout: number | undefined;
  let imageRef: HTMLImageElement | undefined;
  let openAnimationFrame: number | undefined;

  const isDialogOpen = () => phase() !== "idle";
  const isZoomed = () => phase() === "open";
  const triggerLabel = () => (props.alt ? `Zoomer ${props.alt}` : "Zoomer l'image");
  const zoomFrameStyle = () => getZoomFrameStyle(rect(), isZoomed());
  const zoomImageProps = () => getZoomImageProps(inheritedZoomImageProps, IMAGE_ZOOM.zoomImage, props.zoomImageProps);

  const cancelOpenTransition = () => {
    if (openAnimationFrame === undefined || typeof window === "undefined") return;

    window.cancelAnimationFrame(openAnimationFrame);
    openAnimationFrame = undefined;
  };

  const measure = (): ZoomRect | undefined => {
    if (!(imageRef && typeof window !== "undefined")) return;

    const next = getImageContentRect(imageRef);

    window.clearTimeout(closeTimeout);
    setRect(next);
    return next;
  };

  const openZoom = () => {
    if (phase() !== "idle") return;

    const next = measure();
    if (!next || typeof window === "undefined") return;

    cancelOpenTransition();
    setPhase("opening");
    openAnimationFrame = window.requestAnimationFrame(() => {
      openAnimationFrame = window.requestAnimationFrame(() => {
        openAnimationFrame = undefined;
        setPhase("open");
      });
    });
  };

  const closeZoom = () => {
    if (phase() === "idle" || typeof window === "undefined") return;
    cancelOpenTransition();
    setPhase("closing");
    window.clearTimeout(closeTimeout);
    closeTimeout = window.setTimeout(() => {
      setPhase("idle");
      setRect(null);
    }, ZOOM_DURATION_MS);
  };

  createEffect(
    () => isDialogOpen(),
    (open) => {
      if (!open || typeof window === "undefined") return;

      const onResize = () => {
        if (!imageRef) return;
        setRect(getImageContentRect(imageRef));
      };

      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
      };
    }
  );

  onSettled(() => {
    if (typeof window === "undefined") return;

    return () => {
      cancelOpenTransition();
      window.clearTimeout(closeTimeout);
    };
  });

  return (
    <Dialog onOpenChange={(open) => (open ? openZoom() : closeZoom())} open={isDialogOpen()}>
      <DialogTrigger
        {...triggerImageProps}
        aria-label={triggerLabel()}
        as={Image}
        class={cn(IMAGE_ZOOM.triggerImage, isDialogOpen() && "opacity-0", props.class)}
        onClick={openZoom}
        ref={setImageRef(props, (element) => (imageRef = element))}
      />
      <DialogContent class={IMAGE_ZOOM.dialog} onClick={closeZoom} showCloseButton={false}>
        <div class={cn(IMAGE_ZOOM.backdrop, isZoomed() ? "opacity-100" : "opacity-0")} />
        <Show when={rect()}>
          <Image {...zoomImageProps()} style={zoomFrameStyle()} />
        </Show>
      </DialogContent>
    </Dialog>
  );
}
export type ImageZoomProps = ImageProps & { zoomImageProps?: Partial<ImageProps> };

// UTILS -----------------------------------------------------------------------------------------------------------------------------------
const SCREEN_PADDING_PX = 20;
const ZOOM_DURATION_MS = 300;

const getFiniteNumber = (value: unknown): number | undefined => {
  let numberValue = Number.NaN;
  if (typeof value === "number") {
    numberValue = value;
  }
  if (typeof value === "string") {
    numberValue = Number.parseFloat(value);
  }

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined;
};

const getImageRatio = (widthValue: unknown, heightValue: unknown): number | undefined => {
  const width = getFiniteNumber(widthValue);
  const height = getFiniteNumber(heightValue);
  return width && height ? width / height : undefined;
};

const getImageContentRect = (image: HTMLImageElement): ZoomRect => {
  const rect = image.getBoundingClientRect();
  const imageRect = {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
  const ratio = getImageRatio(image.naturalWidth, image.naturalHeight);
  if (!ratio) return imageRect;

  const style = window.getComputedStyle(image);
  if (style.objectFit !== "cover" && style.objectFit !== "contain") return imageRect;

  const boxRatio = imageRect.width / imageRect.height;
  const shouldMatchHeight = style.objectFit === "cover" ? boxRatio < ratio : boxRatio > ratio;
  const imageWidth = shouldMatchHeight ? imageRect.height * ratio : imageRect.width;
  const imageHeight = imageWidth / ratio;
  const { x, y } = parseObjectPosition(style.objectPosition);

  return {
    height: imageHeight,
    left: imageRect.left + (imageRect.width - imageWidth) * x,
    top: imageRect.top + (imageRect.height - imageHeight) * y,
    width: imageWidth,
  };
};

const getZoomFrameStyle = (rect: ZoomRect | null, zoomed: boolean): JSX.CSSProperties => {
  if (!rect) return {};

  const scale = getZoomScale(rect);
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

const getZoomScale = (rect: ZoomRect): number =>
  Math.min((window.innerWidth - SCREEN_PADDING_PX * 2) / rect.width, (window.innerHeight - SCREEN_PADDING_PX * 2) / rect.height);

const parseObjectPosition = (value: string): ObjectPosition => {
  const [xValue, yValue = "50%"] = value.split(" ");
  return {
    x: parsePositionValue(xValue),
    y: parsePositionValue(yValue),
  };
};

const parsePositionValue = (value = "50%"): number => {
  if (value === "left" || value === "top") return 0;
  if (value === "right" || value === "bottom") return 1;
  if (value === "center") return 0.5;
  if (value.endsWith("%")) return Number.parseFloat(value) / 100;
  return 0.5;
};

const getZoomImageProps = (
  imageProps: Omit<ImageZoomProps, "class" | "objectFit" | "ref" | "zoomImageProps">,
  className: string,
  overrides: Partial<ImageProps> = {}
): ImageProps =>
  ({
    ...imageProps,
    ...overrides,
    class: cn(className, overrides.class),
    loading: overrides.loading ?? ("eager" as const),
  }) as ImageProps;

const setImageRef = (props: ImageZoomProps, setLocalRef: (element: HTMLImageElement) => void) => (element: HTMLImageElement) => {
  setLocalRef(element);

  if (typeof props.ref === "function") {
    props.ref(element);
  }
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ZoomPhase = "idle" | "opening" | "open" | "closing";

type ZoomRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type ObjectPosition = {
  x: number;
  y: number;
};
