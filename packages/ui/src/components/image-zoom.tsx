import { Image, type ImageProps } from "@ec/unpic-solid2";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function ImageZoom(props: ImageZoomProps) {
  return (
    <Image
      alt={props.alt}
      background={props.background}
      breakpoints={props.breakpoints}
      class={props.class}
      height={props.height}
      sizes={props.sizes}
      src={props.src}
      width={props.width}
    />
  );
}
export type ImageZoomProps = ImageProps;
