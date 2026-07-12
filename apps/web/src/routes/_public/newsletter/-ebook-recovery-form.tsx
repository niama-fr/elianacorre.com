import { zEbookRecoveryRequestValues } from "@ec/domain/schemas/ebook-recoveries";
import { useAppForm } from "@ec/ui/hooks/public-form";
import { useMutation } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { toast } from "sonner";

import { requestEbookRecovery } from "@/lib/newsletter/functions";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FORM = {
  base: cva("group/form flex w-full max-w-md flex-col items-end gap-4"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function EbookRecoveryForm() {
  const requestEbookRecoveryMutation = useMutation({ mutationFn: requestEbookRecovery });
  const form = useAppForm({
    defaultValues: { email: "", website: "" },
    onSubmit: async ({ value: data }) => {
      try {
        await requestEbookRecoveryMutation.mutateAsync({ data });
        form.reset();
        toast.success("Vérifiez votre messagerie", {
          description:
            "Si cette adresse peut recevoir un nouveau lien, vous le recevrez prochainement. Pensez à vérifier vos courriers indésirables.",
        });
      } catch {
        toast.error("La demande n’a pas pu être envoyée. Veuillez réessayer dans quelques instants.");
      }
    },
  });

  return (
    <form
      className={FORM.base()}
      data-intent="secondary"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.AppField name="email" validators={{ onChange: zEbookRecoveryRequestValues.shape.email }}>
          {(field) => <field.InputField label="Adresse e-mail" type="email" />}
        </form.AppField>
        <form.AppField name="website" validators={{ onChange: zEbookRecoveryRequestValues.shape.website }}>
          {(field) => (
            <div aria-hidden="true" className="sr-only">
              <field.InputField autoComplete="off" label="Laissez ce champ vide" tabIndex={-1} type="text" />
            </div>
          )}
        </form.AppField>
        <form.Submit intent="secondary" label="Recevoir un nouveau lien" className={{ base: "max-w-xs" }} />
      </form.AppForm>
    </form>
  );
}
