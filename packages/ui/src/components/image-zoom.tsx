// import { Dialog, DialogContent, DialogTrigger } from "@ec/ui/dialog";
import { Dialog } from "@ec/ui/dialog";
import { Image, type ImageProps } from "@ec/unpic-solid2";
import type { ComponentProps } from "@solidjs/web";
import { createMemo, createSignal, omit } from "solid-js";
import { cn } from "@/lib/utils";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(props: ImageZoomProps) {
  const rest = omit(props, "class", "img", "unzoomLabel", "zoomImg", "zoomLabel");
  const img = createMemo(() => props.img);
  const zoomImg = createMemo(() => props.zoomImg);
  const C = createMemo(() => props.class ?? {});
  const [open, setOpen] = createSignal(false);
  const [zoomLoaded, setZoomLoaded] = createSignal(false);

  const openZoom = () => {
    setZoomLoaded(false);
    setOpen(true);
  };
  const closeZoom = () => setOpen(false);

  return (
    <Dialog>
      {/*<DialogTrigger>
          <Image {...img()} class={cn(IMAGE_ZOOM.triggerImage, props.img.class, C().triggerImage)} />
        </DialogTrigger>
        <DialogContent> */}
      <button
        aria-label={props.unzoomLabel ?? "Minimiser l'image"}
        class={cn(IMAGE_ZOOM.backdrop, C().backdrop)}
        onClick={closeZoom}
        type="button"
      />
      <button
        aria-label={props.unzoomLabel ?? "Minimiser l'image"}
        class={cn(IMAGE_ZOOM.closeButton, C().closeButton)}
        onClick={closeZoom}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
      <figure class={cn(IMAGE_ZOOM.figure, C().figure)}>
        <Image {...img()} class={cn(IMAGE_ZOOM.fallbackImage, zoomLoaded() && "opacity-0", C().fallbackImage)} />
        <Image
          {...zoomImg()}
          class={cn(IMAGE_ZOOM.zoomImage, props.zoomImg.class, zoomLoaded() && "opacity-100", C().zoomImage)}
          loading="eager"
          onLoad={() => setZoomLoaded(true)}
        />
      </figure>
      {/* </DialogContent> */}
    </Dialog>
  );
}

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const IMAGE_ZOOM = {
  backdrop: "absolute inset-0 cursor-zoom-out",
  closeButton:
    "absolute top-4 right-4 z-20 grid size-11 place-items-center rounded-full bg-background/80 font-light text-4xl leading-none shadow-lg backdrop-blur-md transition hover:bg-background",
  dialog:
    "fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/80 p-5 backdrop-blur-md transition-opacity duration-300",
  fallbackImage: "absolute inset-0 size-full object-contain transition-opacity duration-200",
  figure: "relative max-h-full max-w-full",
  trigger: "block size-full cursor-zoom-in overflow-hidden p-0 text-left",
  triggerImage: "size-full object-cover",
  zoomImage:
    "relative z-10 max-h-[calc(100dvh-2.5rem)] max-w-[calc(100dvw-2.5rem)] object-contain opacity-0 transition-opacity duration-200",
} as const;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ImageZoomClass = Partial<Record<keyof typeof IMAGE_ZOOM, string>>;

type ImageZoomOwnProps = {
  class?: ImageZoomClass;
  img: ImageProps;
  unzoomLabel?: string;
  zoomImg: ImageProps;
  zoomLabel?: string;
};

export type ImageZoomProps = Omit<ComponentProps<"button">, "class" | "children"> & ImageZoomOwnProps;
