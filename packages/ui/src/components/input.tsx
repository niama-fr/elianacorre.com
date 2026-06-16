import { cva } from "class-variance-authority";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const INPUT =
  cva(`z-input w-full h-9 min-w-0 outline-none rounded-md border border-input bg-white px-2.5 py-1 text-base shadow-xs outline-none
  file:inline-flex file:border-0 file:bg-transparent file:text-foreground 
  transition-[color,box-shadow] 
  placeholder:text-muted-foreground 
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 
  disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50
  aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive`);

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Input = (props: InputProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <input class={cn(INPUT(), _.class)} data-slot="input" {...others} />;
};
export type InputProps = ComponentProps<"input">;
