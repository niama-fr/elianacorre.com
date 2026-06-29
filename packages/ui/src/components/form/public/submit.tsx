import { Btn } from "@ec/ui/components/btn";
import { LoadingSwap } from "@ec/ui/components/loading-swap";
import { useFormContext } from "@ec/ui/hooks/public-form-context";

export default function Submit({ ref }: SubmitProps) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Btn ref={ref}>
          <LoadingSwap isLoading={isSubmitting}>Envoyer</LoadingSwap>
        </Btn>
      )}
    </form.Subscribe>
  );
}
export type SubmitProps = { ref?: React.RefObject<HTMLButtonElement | null> };
