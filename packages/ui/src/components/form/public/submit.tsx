import { Btn, type BtnProps } from "@ec/ui/components/btn";
import { LoadingSwap } from "@ec/ui/components/loading-swap";
import { useFormContext } from "@ec/ui/hooks/public-form-context";
import { cn } from "@ec/ui/lib/utils";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const SUBMIT = {
  base: cva("cursor-pointer"),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default function Submit({ className, label = "Envoyer", ...rest }: SubmitProps) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Btn kind="button" className={{ base: cn(SUBMIT.base(), className) }} {...rest}>
          <LoadingSwap isLoading={isSubmitting}>{label}</LoadingSwap>
        </Btn>
      )}
    </form.Subscribe>
  );
}
export type SubmitProps = Omit<BtnProps, "className" | "kind"> & {
  className?: string;
  label?: string;
  ref?: React.RefObject<HTMLButtonElement | null>;
};
