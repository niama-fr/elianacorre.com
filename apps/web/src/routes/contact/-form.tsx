import confetti from "canvas-confetti";
import { cva } from "class-variance-authority";
import { Schema as S } from "effect";
import { useRef } from "react";
import { toast } from "sonner";

import { createContactRequest } from "@/features/contact-requests/contact-requests.functions";
import { sContactRequestCreate } from "@/features/contact-requests/contact-requests.schemas";
import { useAppForm } from "@/form/hook";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const FORM = {
  base: cva("flex w-full flex-col items-end gap-4"),
  submit: cva("text-base"),
};

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function ContactForm() {
  const submitRef = useRef<HTMLButtonElement>(null);

  const form = useAppForm({
    defaultValues: { email: "", firstName: "", message: "", website: "" },
    onSubmit: async ({ value: data }) => {
      try {
        await createContactRequest({ data });

        if (submitRef.current) {
          const rect = submitRef.current.getBoundingClientRect();
          void confetti({
            origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
            particleCount: 100,
            spread: 70,
          });
        }

        form.reset();
        toast.success("Merci de votre intérêt ! Je vous recontacte très bientôt.");
      } catch {
        toast.error("La demande n’a pas pu être envoyée. Veuillez réessayer dans quelques instants.");
      }
    },
  });

  return (
    <form
      className={FORM.base()}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.AppField name="firstName" validators={{ onChange: S.toStandardSchemaV1(sContactRequestCreate.fields.firstName) }}>
          {(f) => <f.InputField label="Prénom" type="text" />}
        </form.AppField>
        <form.AppField name="email" validators={{ onChange: S.toStandardSchemaV1(sContactRequestCreate.fields.email) }}>
          {(f) => <f.InputField label="Courriel" type="email" />}
        </form.AppField>
        <form.AppField name="message" validators={{ onChange: S.toStandardSchemaV1(sContactRequestCreate.fields.message) }}>
          {(f) => <f.TextareaField label="Message" />}
        </form.AppField>
        <form.AppField name="website" validators={{ onChange: S.toStandardSchemaV1(sContactRequestCreate.fields.website) }}>
          {(f) => (
            <div aria-hidden="true" className="sr-only">
              <f.InputField autoComplete="off" label="Laissez ce champ vide" tabIndex={-1} type="text" />
            </div>
          )}
        </form.AppField>
        <form.Submit ref={submitRef} icon="icon-[tabler--send-2]" className={FORM.submit()} />
      </form.AppForm>
    </form>
  );
}
