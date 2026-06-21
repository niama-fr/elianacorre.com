import { Btn } from "@ec/ui/btn";
import { useFormContext } from "@ec/ui/hooks/form-context";
import { LoadingSwap } from "@ec/ui/loading-swap";

export default function Submit({ ref }: { ref?: HTMLButtonElement }) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Btn ref={ref}>
          <LoadingSwap isLoading={isSubmitting()}>Envoyer</LoadingSwap>
        </Btn>
      )}
    </form.Subscribe>
  );
}
