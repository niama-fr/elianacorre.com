import { transformProps, type UnpicImageProps } from "@unpic/core";
import type { JSX } from "solid-js/jsx-runtime";

export function Image(props: ImageProps): JSX.Element {
  const transformed = transformProps<SolidImageAttributes>(props);
  return <img {...transformed} alt={transformed.alt} height={transformed.height} width={transformed.width} />;
}
// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ImageProps = UnpicImageProps<SolidImageAttributes> & Pick<SolidImageAttributes, "style">;

type SolidImageAttributes = JSX.ImgHTMLAttributes<HTMLImageElement>;

// Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, keyof CoreImageAttributes> & CoreImageAttributes<JSX.CSSProperties | string>;
