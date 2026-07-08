import type { NewsletterLegalBundles } from "@ec/domain/schemas/newsletter-legal-bundles";
import { zNewsletterSubUpsertValues } from "@ec/domain/schemas/newsletter-subs";
import { useAppForm } from "@ec/ui/hooks/public-form";
import { useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { cva } from "class-variance-authority";
import { useRef } from "react";
import { toast } from "sonner";

import { upsertNewsletterSub } from "@/lib/newsletter/functions";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FORM = {
  base: cva("group/form flex w-full flex-col items-end gap-4"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function NewsletterForm({ bundle }: { bundle: NewsletterLegalBundles["Entity"] }) {
  const submitRef = useRef<HTMLButtonElement>(null);
  const upsertNewsletterSubMutation = useMutation({ mutationFn: upsertNewsletterSub });

  const form = useAppForm({
    defaultValues: { consent: false, email: "", firstName: "", website: "" },
    onSubmit: async ({ value: data }) => {
      if (!submitRef.current) return;
      const rect = submitRef.current.getBoundingClientRect();
      try {
        await upsertNewsletterSubMutation.mutateAsync({ data });

        void confetti({
          origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
          particleCount: 100,
          spread: 70,
        });

        form.reset();
        toast.success("Vérifiez votre messagerie", {
          description:
            "Si une action est nécessaire pour cette adresse, vous recevrez prochainement un e-mail. Pensez à vérifier votre dossier de courriers indésirables. Les liens de confirmation restent valables pendant 24 heures.",
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
        <form.AppField name="email" validators={{ onChange: zNewsletterSubUpsertValues.shape.email }}>
          {(f) => <f.InputField label="Adresse e-mail" type="email" />}
        </form.AppField>
        <form.AppField name="firstName" validators={{ onChange: zNewsletterSubUpsertValues.shape.firstName }}>
          {(f) => <f.InputField label="Prénom (facultatif)" type="text" />}
        </form.AppField>
        <form.AppField name="website" validators={{ onChange: zNewsletterSubUpsertValues.shape.website }}>
          {(f) => (
            <div aria-hidden="true" className="sr-only">
              <f.InputField autoComplete="off" label="Laissez ce champ vide" tabIndex={-1} type="text" />
            </div>
          )}
        </form.AppField>
        <form.AppField name="consent" validators={{ onChange: zNewsletterSubUpsertValues.shape.consent }}>
          {(f) => <f.CheckboxField label={bundle.newsletterConsent.content} />}
        </form.AppField>

        <form.Submit ref={submitRef} intent="secondary" label="M’inscrire et recevoir l’e-book" className={{ base: "max-w-xs" }} />
      </form.AppForm>
    </form>
  );
}
