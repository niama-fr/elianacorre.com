import { cn } from "@ec/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const LOADING_SWAP = {
  base: cva("grid grid-cols-1 items-center justify-items-center"),
  children: cva("col-start-1 col-end-2 row-start-1 row-end-2 w-full", {
    defaultVariants: {
      isLoading: false,
    },
    variants: {
      isLoading: {
        false: "visible",
        true: "invisible",
      },
    },
  }),
  loader: cva("col-start-1 col-end-2 row-start-1 row-end-2", {
    defaultVariants: {
      isLoading: false,
    },
    variants: {
      isLoading: {
        false: "invisible",
        true: "visible",
      },
    },
  }),
  spinner: cva("icon-[lucide--loader-circle] animate-spin"),
} as const;

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function LoadingSwap(props: LoadingSwapProps) {
  const { children, className, isLoading, ...rest } = props;
  return (
    <div className={LOADING_SWAP.base()} {...rest}>
      <div className={cn(LOADING_SWAP.children({ isLoading }), className)}>{children}</div>
      <div className={cn(LOADING_SWAP.loader({ isLoading }), className)}>
        <span className={LOADING_SWAP.spinner()} />
      </div>
    </div>
  );
}
export type LoadingSwapProps = React.ComponentProps<"div"> & LoadingSwapStyles;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LoadingSwapStyles = VariantProps<typeof LOADING_SWAP.children>;
