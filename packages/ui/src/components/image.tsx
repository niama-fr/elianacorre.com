import { transformProps, type UnpicImageProps } from "@unpic/core";
import { createMemo, mergeProps } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

export function Image(props: ImageProps): JSX.Element {
  const transformed = createMemo(() => transformProps<SolidImageAttributes>(props));
  const style = createMemo(() => mergeProps(props.style ?? {}, transformed().style ?? {}));

  return <img {...transformed()} alt={transformed().alt} height={transformed().height} style={style()} width={transformed().width} />;
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ImageProps = UnpicImageProps<SolidImageAttributes> & Pick<SolidImageAttributes, "style">;
type SolidImageAttributes = JSX.ImgHTMLAttributes<HTMLImageElement>;
