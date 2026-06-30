import { Button, type ButtonProps } from "@ec/ui/components/button";
import { LoadingSwap } from "@ec/ui/components/loading-swap";
import { useFormContext } from "@ec/ui/hooks/admin-form-context";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const SUBMIT = {
  base: cva("cursor-pointer"),
  icon: cva("size-4"),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function Submit(props: SubmitProps) {
  const { className, icon: _, label, ...rest } = props;
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button size="lg" type="submit" className={cn(SUBMIT.base(), className)} {...rest}>
          <LoadingSwap isLoading={isSubmitting}>{label}</LoadingSwap>
        </Button>
      )}
    </form.Subscribe>
  );
}
export type SubmitProps = ButtonProps & { icon?: string; label: string };
