import { cva } from "class-variance-authority";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const INPUT = cva(
  "z-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
);

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export const Input = (props: InputProps) => {
  const [_, others] = splitProps(props, ["class"]);
  return <input class={cn(INPUT(), _.class)} data-slot="input" {...others} />;
};
export type InputProps = ComponentProps<"input">;
