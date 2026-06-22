import { zContactCreateValues } from "@ec/domain/contacts";
import { useAppForm } from "@ec/ui/hooks/form";
import confetti from "canvas-confetti";
import { toast } from "solid-sonner";
import { createContact } from "@/functions/form";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function IndexForm() {
  // Solid assigns this ref through JSX at runtime.
  // oxlint-disable-next-line no-unassigned-vars
  let submitRef!: HTMLButtonElement;

  const form = useAppForm(() => ({
    defaultValues: { email: "", forename: "", message: "", surname: "" },
    onSubmit: async ({ value }) => {
      if (!submitRef) return;
      const rect = submitRef.getBoundingClientRect();

      await createContact({ data: value });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      });

      form.reset();
      toast.success("Merci de votre intérêt ! Je vous recontacte très bientôt.");
    },
  }));

  return (
    <form
      class="flex w-full flex-col items-end gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.AppField name="forename" validators={{ onChange: zContactCreateValues.shape.forename }}>
          {(f) => <f.InputField label="Prénom" type="text" />}
        </form.AppField>
        <form.AppField name="surname" validators={{ onChange: zContactCreateValues.shape.surname }}>
          {(f) => <f.InputField label="Nom" type="text" />}
        </form.AppField>
        <form.AppField name="email" validators={{ onChange: zContactCreateValues.shape.email }}>
          {(f) => <f.InputField label="Courriel" type="email" />}
        </form.AppField>
        <form.AppField name="message" validators={{ onChange: zContactCreateValues.shape.message }}>
          {(f) => <f.TextareaField label="Message" />}
        </form.AppField>
        <form.Submit ref={submitRef} />
      </form.AppForm>
    </form>
  );
}
