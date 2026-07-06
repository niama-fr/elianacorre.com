import { transformProps, type UnpicImageProps } from "@unpic/core";

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
const fixedMap: Record<string, string> = { fetchpriority: "fetchPriority", srcset: "srcSet" };

const camelize = (key: string) => {
  if (key.startsWith("data-") || key.startsWith("aria-") || key.startsWith("--")) return key;
  return fixedMap[key] ?? key.replaceAll(/-(?<char>[a-z])/gu, (_, char: string) => char.toUpperCase());
};

const isPlainObject = (value: unknown): value is object =>
  value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;

function toReactImgProps(props: object): ReactImgProps {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      const nextKey = camelize(key);

      if (key === "style" && isPlainObject(value))
        return [nextKey, Object.fromEntries(Object.entries(value).map(([styleKey, styleValue]) => [camelize(styleKey), styleValue]))];

      return [nextKey, value];
    })
  );
}

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function Image({ style, ...rest }: ImageProps) {
  const props = toReactImgProps(transformProps<ReactImgProps>(rest as UnpicReactImageProps));
  return <img {...props} alt={props.alt} style={{ ...props.style, ...style }} />;
}

export type ImageProps = Omit<UnpicReactImageProps, "style"> & { style?: React.CSSProperties };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ReactImgProps = React.ImgHTMLAttributes<HTMLImageElement>;
type UnpicReactImageProps = UnpicImageProps<ReactImgProps>;
