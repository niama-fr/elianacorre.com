import type { JSX } from "@solidjs/web";
import { type CoreImageAttributes, transformProps, type UnpicImageProps } from "@unpic/core";
import { createMemo, omit, Show } from "solid-js";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function Image(props: ImageProps): JSX.Element {
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
    "style",
    "unstyled",
    "width"
  );

  const transformed = createMemo(() => (props.src ? transformProps<SolidImageAttributes>(props) : null));
  return (
    <Show when={transformed()}>
      {(image) => (
        <img
          {...rest}
          alt={stringAttr(image().alt) ?? ""}
          decoding={image().decoding ?? undefined}
          fetchpriority={image().fetchpriority ?? undefined}
          height={image().height ?? undefined}
          loading={image().loading ?? undefined}
          role={(image().role ?? undefined) as JSX.ImgHTMLAttributes<HTMLImageElement>["role"]}
          sizes={stringAttr(image().sizes)}
          src={stringAttr(image().src)}
          srcset={stringAttr(image().srcset)}
          style={mergeStyle(image().style, props.style)}
          width={image().width ?? undefined}
        />
      )}
    </Show>
  );
}

// UTILS -----------------------------------------------------------------------------------------------------------------------------------
const stringAttr = (value: unknown): string | undefined => (value == null ? undefined : String(value));

const mergeStyle = (base: JSX.CSSProperties | string | undefined, override: JSX.CSSProperties | string | undefined) => {
  if (override == null) return base;
  if (base == null) return override;
  if (typeof base === "string" || typeof override === "string") return override;

  return {
    ...base,
    ...override,
  };
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ImageProps = UnpicImageProps<SolidImageAttributes> & Pick<SolidImageAttributes, "style">;

type SolidImageAttributes = Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, keyof CoreImageAttributes> &
  CoreImageAttributes<JSX.CSSProperties | string>;
