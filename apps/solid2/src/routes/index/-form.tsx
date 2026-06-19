import confetti from "canvas-confetti";
import { useRef } from "react";
import { toast } from "sonner";
import { createContact } from "@/functions/form";
import { useAppForm } from "@/hooks/form";
import { zContactCreateValues } from "@/lib/domain";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function IndexForm() {
  const submitRef = useRef<HTMLButtonElement>(null);
  const form = useAppForm({
    defaultValues: { email: "", forename: "", message: "", surname: "" },
    onSubmit: async ({ value }) => {
      if (!submitRef.current) return;
      const rect = submitRef.current.getBoundingClientRect();

      await createContact({ data: value });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
      });
      form.reset();
      toast.success("Merci de votre intérêt ! Je vous recontacte très bientôt.");
    },
  });

  return (
    <form
      className="flex w-full flex-col items-end gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.AppField name="forename" validators={{ onChange: zContactCreateValues.shape.forename }}>
          {({ InputField }) => <InputField label="Prénom" type="text" />}
        </form.AppField>
        <form.AppField name="surname" validators={{ onChange: zContactCreateValues.shape.surname }}>
          {({ InputField }) => <InputField label="Nom" type="text" />}
        </form.AppField>
        <form.AppField name="email" validators={{ onChange: zContactCreateValues.shape.email }}>
          {({ InputField }) => <InputField label="Courriel" type="email" />}
        </form.AppField>
        <form.AppField name="message" validators={{ onChange: zContactCreateValues.shape.message }}>
          {({ TextareaField }) => <TextareaField label="Message" />}
        </form.AppField>
        <form.Submit ref={submitRef} />
      </form.AppForm>
    </form>
  );
}
