import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const LOADING_SWAP = {
  base: cva("grid grid-cols-1 items-center justify-items-center"),
  children: cva("col-start-1 col-end-2 row-start-1 row-end-2 w-full", {
    variants: {
      isLoading: {
        false: "visible",
        true: "invisible",
      },
    },
    defaultVariants: {
      isLoading: false,
    },
  }),
  loader: cva("col-start-1 col-end-2 row-start-1 row-end-2", {
    variants: {
      isLoading: {
        false: "invisible",
        true: "visible",
      },
    },
    defaultVariants: {
      isLoading: false,
    },
  }),
  spinner: cva("icon-[lucide--loader-circle] animate-spin"),
} as const;

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function LoadingSwap(props: LoadingSwapProps) {
  const [_, rest] = splitProps(props, ["children", "class", "isLoading"]);
  return (
    <div class={LOADING_SWAP.base()} {...rest}>
      <div class={cn(LOADING_SWAP.children({ isLoading: _.isLoading }), _.class)}>{_.children}</div>
      <div class={cn(LOADING_SWAP.loader({ isLoading: _.isLoading }), _.class)}>
        <span class={LOADING_SWAP.spinner()} />
      </div>
    </div>
  );
}
export type LoadingSwapProps = ComponentProps<"div"> & LoadingSwapStyles;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LoadingSwapStyles = VariantProps<typeof LOADING_SWAP.children>;
