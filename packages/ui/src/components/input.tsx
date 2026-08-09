import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";
import * as React from "react";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const INPUT = cva(
  `group/input border-input bg-input/30 file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-9 w-full 
  min-w-0 rounded-4xl border px-3 py-1 text-base transition-colors 
  outline-none 
  file:inline-flex file:h-7 file:border-0 
  file:bg-transparent file:text-sm file:font-medium 
  focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed 
  disabled:opacity-50 
  aria-invalid:ring-[3px] md:text-sm`
);

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Input({ className, type, ...props }: InputProps) {
  return <InputPrimitive type={type} data-slot="input" className={cn(INPUT(), className)} {...props} />;
}
export type InputProps = React.ComponentProps<"input">;
