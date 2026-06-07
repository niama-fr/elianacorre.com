import type { JSX } from "@solidjs/web";
import { type CoreImageAttributes, transformProps, type UnpicImageProps } from "@unpic/core";
import { createMemo, omit } from "solid-js";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function Image(props: ImageProps): JSX.Element {
  if (!props.src) return null;

  const rest = omit(
    props,
    "alt",
    "aspectRatio",
    "background",
    "breakpoints",
    "cdn",
    "decoding",
    "fallback",
    "fetchpriority",
    "height",
    "layout",
    "loading",
    "objectFit",
    "operations",
    "options",
    "priority",
    "role",
    "sizes",
    "src",
    "unstyled",
    "width"
  );

  const transformed = createMemo(() => transformProps<SolidImageAttributes>(props));
  return (
    <img
      {...rest}
      alt={stringAttr(transformed().alt) ?? ""}
      decoding={transformed().decoding ?? undefined}
      fetchpriority={transformed().fetchpriority ?? undefined}
      height={transformed().height ?? undefined}
      loading={transformed().loading ?? undefined}
      role={(transformed().role ?? undefined) as JSX.ImgHTMLAttributes<HTMLImageElement>["role"]}
      sizes={stringAttr(transformed().sizes)}
      src={stringAttr(transformed().src)}
      srcset={stringAttr(transformed().srcset)}
      style={transformed().style}
      width={transformed().width ?? undefined}
    />
  );
}

// UTILS -----------------------------------------------------------------------------------------------------------------------------------
const stringAttr = (value: unknown): string | undefined => (value == null ? undefined : String(value));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ImageProps = UnpicImageProps<SolidImageAttributes>;

type SolidImageAttributes = Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, keyof CoreImageAttributes> &
  CoreImageAttributes<JSX.CSSProperties | string>;
