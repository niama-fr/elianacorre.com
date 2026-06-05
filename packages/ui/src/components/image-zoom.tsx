import Zoom, { type ControlledProps, type UncontrolledProps } from "react-medium-image-zoom";
import { cn } from "@/lib/utils";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export const ImageZoom = ({ className, backdropClassName, ...props }: ImageZoomProps) => (
  <Zoom
    a11yNameButtonUnzoom="Minimiser l'image"
    a11yNameButtonZoom="Zoomer l'image"
    classDialog={cn(
      "backdrop:hidden",
      "open:fixed open:m-0 open:h-dvh open:max-h-none open:w-dvw open:max-w-none open:overflow-hidden open:border-0 open:bg-transparent open:p-0",
      "**:data-rmiz-modal-overlay:absolute **:data-rmiz-modal-overlay:inset-0 **:data-rmiz-modal-overlay:transition-all",
      "**:data-[rmiz-modal-overlay=hidden]:bg-transparent",
      "**:data-[rmiz-modal-overlay=visible]:bg-background/80 **:data-[rmiz-modal-overlay=visible]:backdrop-blur-md",
      "**:data-rmiz-modal-content:relative **:data-rmiz-modal-content:size-full",
      "**:data-rmiz-modal-img:absolute **:data-rmiz-modal-img:origin-top-left **:data-rmiz-modal-img:cursor-zoom-out **:data-rmiz-modal-img:transition-transform",
      "motion-reduce:**:data-rmiz-modal-img:transition-none motion-reduce:**:data-rmiz-modal-overlay:transition-none",
      backdropClassName
    )}
    zoomMargin={20}
    {...props}
  />
);
export type ImageZoomProps = UncontrolledProps & {
  isZoomed?: ControlledProps["isZoomed"];
  onZoomChange?: ControlledProps["onZoomChange"];
  className?: string;
  backdropClassName?: string;
};
