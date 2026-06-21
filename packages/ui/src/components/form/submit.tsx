import { useFormContext } from "../../hooks/form-context";
import { Btn } from "../btn";
import { LoadingSwap } from "../loading-swap";

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
