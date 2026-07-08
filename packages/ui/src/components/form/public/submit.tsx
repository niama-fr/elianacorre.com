import { Btn, type BtnProps } from "@ec/ui/components/btn";
import { LoadingSwap } from "@ec/ui/components/loading-swap";
import { useFormContext } from "@ec/ui/hooks/public-form-context";

export default function Submit({ label = "Envoyer", ...rest }: SubmitProps) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Btn kind="button" {...rest}>
          <LoadingSwap isLoading={isSubmitting}>{label}</LoadingSwap>
        </Btn>
      )}
    </form.Subscribe>
  );
}
export type SubmitProps = Omit<BtnProps, "kind"> & { label?: string; ref?: React.RefObject<HTMLButtonElement | null> };
