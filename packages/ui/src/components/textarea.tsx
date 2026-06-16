import { cva } from "class-variance-authority";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const TEXTAREA =
  cva(`field-sizing-content flex min-h-16 w-full rounded-md border border-input bg-white px-2.5 py-2 text-base shadow-xs outline-none 
  transition-[color,box-shadow] 
  placeholder:text-muted-foreground 
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 
  disabled:cursor-not-allowed disabled:opacity-50 
  aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 
  md:text-sm`);

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Textarea = (props: TextareaProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <textarea class={cn(TEXTAREA(), _.class)} data-slot="textarea" {...others} />;
};
export type TextareaProps = ComponentProps<"textarea">;
