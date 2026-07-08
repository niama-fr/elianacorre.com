import { zContactRequestCreateValues } from "@ec/domain/schemas/contact-requests";
import { useAppForm } from "@ec/ui/hooks/public-form";
import { useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { useRef } from "react";
import { toast } from "sonner";

import { createContact } from "@/lib/contact-form/functions";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function ContactForm() {
  const submitRef = useRef<HTMLButtonElement>(null);
  const createContactMutation = useMutation({ mutationFn: createContact });

  const form = useAppForm({
    defaultValues: { email: "", firstName: "", lastName: "", message: "" },
    onSubmit: async ({ value: data }) => {
      if (!submitRef.current) return;
      const rect = submitRef.current.getBoundingClientRect();

      await createContactMutation.mutateAsync({ data });

      void confetti({
        origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
        particleCount: 100,
        spread: 70,
      });

      form.reset();
      toast.success("Merci de votre intérêt ! Je vous recontacte très bientôt.");
    },
  });

  return (
    <form
      className="flex w-full flex-col items-end gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.AppField name="firstName" validators={{ onChange: zContactRequestCreateValues.shape.firstName }}>
          {(f) => <f.InputField label="Prénom" type="text" />}
        </form.AppField>
        <form.AppField name="lastName" validators={{ onChange: zContactRequestCreateValues.shape.lastName }}>
          {(f) => <f.InputField label="Nom" type="text" />}
        </form.AppField>
        <form.AppField name="email" validators={{ onChange: zContactRequestCreateValues.shape.email }}>
          {(f) => <f.InputField label="Courriel" type="email" />}
        </form.AppField>
        <form.AppField name="message" validators={{ onChange: zContactRequestCreateValues.shape.message }}>
          {(f) => <f.TextareaField label="Message" />}
        </form.AppField>
        <form.Submit ref={submitRef} />
      </form.AppForm>
    </form>
  );
}
