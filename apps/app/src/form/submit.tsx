import { Button, type ButtonProps } from "@ec/ui/components/button";
import { LoadingSwap } from "@ec/ui/components/loading-swap";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";

import { useFormContext } from "./context";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const SUBMIT = {
  base: cva("cursor-pointer"),
  icon: cva("size-4"),
  main: cva("flex items-center gap-1"),
};

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export default function Submit(props: SubmitProps) {
  const { className, icon, label, ...rest } = props;
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button size="lg" type="submit" className={cn(SUBMIT.base(), className)} {...rest}>
          <LoadingSwap isLoading={isSubmitting}>
            <div className={SUBMIT.main()}>
              {icon && <span className={cn(SUBMIT.icon(), icon)} />}
              {label}
            </div>
          </LoadingSwap>
        </Button>
      )}
    </form.Subscribe>
  );
}
export type SubmitProps = ButtonProps & { icon?: string; label: string };
