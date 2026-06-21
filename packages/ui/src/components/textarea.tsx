import { cn } from "@ui/lib/utils";
import { cva } from "class-variance-authority";
import { type ComponentProps, splitProps } from "solid-js";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const TEXTAREA = cva(
  `field-sizing-content border-input bg-white resize-none rounded-xl border px-3 py-3 text-base transition-colors flex min-h-16 w-full outline-none
  focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
  aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aria-invalid:ring-[3px] 
  md:text-sm 
  placeholder:text-muted-foreground 
  disabled:cursor-not-allowed disabled:opacity-50`
);

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Textarea = (props: TextareaProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <textarea class={cn(TEXTAREA(), _.class)} data-slot="textarea" {...others} />;
};
export type TextareaProps = ComponentProps<"textarea">;
