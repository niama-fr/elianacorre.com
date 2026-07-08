import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";
import { CheckIcon } from "lucide-react";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const CHECKBOX = {
  base: cva(`peer relative flex size-4 shrink-0 items-center justify-center rounded-[6px] border border-input transition-shadow outline-none 
  group-has-disabled/field:opacity-50 
  after:absolute after:-inset-x-3 after:-inset-y-2 
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 
  disabled:cursor-not-allowed disabled:opacity-50 
  aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary 
  dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 
  data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary`),
  indicator: cva("grid place-content-center text-current transition-none [&>svg]:size-3.5"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn(CHECKBOX.base(), className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={CHECKBOX.indicator()}>
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
