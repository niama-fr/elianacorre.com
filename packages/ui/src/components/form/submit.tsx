import { Btn } from "@/components/btn";
import { LoadingSwap } from "@/components/loading-swap";
import { useFormContext } from "@/hooks/form-context";

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
