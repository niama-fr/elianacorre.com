import { zNewsSubscriptionUpsertValues } from "@ec/domain/schemas/news-subscriptions";
import type { NewsletterLegalBundles } from "@ec/domain/schemas/newsletter-legal-bundles";
import { useAppForm } from "@ec/ui/hooks/public-form";
import { cn } from "@ec/ui/lib/utils";
import { mergeForm, useTransform } from "@tanstack/react-form-start";
import confetti from "canvas-confetti";
import { cva } from "class-variance-authority";
import { useRef } from "react";
import { toast } from "sonner";

import type { ServerFormState } from "@/lib/form/form.functions";
import { newsletterFormOptions } from "@/lib/newsletter/newsletter.form";
import { submitNewsletterSubscribeForm, subscribeToNewsletter } from "@/lib/newsletter/newsletter.functions";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const FORM = {
  base: cva("group/form flex w-full flex-col items-end gap-4"),
  submit: cva("self-center md:self-auto"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function NewsletterForm({ bundle, className, formState }: NewsletterFormProps) {
  const submitRef = useRef<HTMLButtonElement>(null);

  const form = useAppForm({
    ...newsletterFormOptions,
    defaultValues: { consent: false, email: "", firstName: "", legalBundleId: bundle._id, website: "" },
    onSubmit: async ({ value: data }) => {
      try {
        await subscribeToNewsletter({ data });

        if (submitRef.current) {
          const rect = submitRef.current.getBoundingClientRect();
          void confetti({
            origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
            particleCount: 100,
            spread: 70,
          });
        }

        form.reset();
        toast.success("Vérifiez votre messagerie", {
          description:
            "Si une action est nécessaire pour cette adresse, vous recevrez prochainement un e-mail. Pensez à vérifier votre dossier de courriers indésirables. Les liens de confirmation restent valables pendant 24 heures.",
        });
      } catch {
        toast.error("La demande n’a pas pu être envoyée. Veuillez réessayer dans quelques instants.");
      }
    },
    transform: useTransform((baseForm) => mergeForm(baseForm, formState), [formState]),
  });

  return (
    <form
      action={submitNewsletterSubscribeForm.url}
      className={cn(FORM.base(), className)}
      data-intent="secondary"
      encType="multipart/form-data"
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppForm>
        <form.AppField name="legalBundleId">
          {(f) => (
            <div aria-hidden="true" className="sr-only">
              <f.InputField readOnly type="hidden" />
            </div>
          )}
        </form.AppField>
        <form.AppField name="email" validators={{ onChange: zNewsSubscriptionUpsertValues.shape.email }}>
          {(f) => <f.InputField label="Adresse e-mail" type="email" />}
        </form.AppField>
        <form.AppField name="firstName" validators={{ onChange: zNewsSubscriptionUpsertValues.shape.firstName }}>
          {(f) => <f.InputField label="Prénom (facultatif)" type="text" />}
        </form.AppField>
        <form.AppField name="website" validators={{ onChange: zNewsSubscriptionUpsertValues.shape.website }}>
          {(f) => (
            <div aria-hidden="true" className="sr-only">
              <f.InputField autoComplete="off" label="Laissez ce champ vide" tabIndex={-1} type="text" />
            </div>
          )}
        </form.AppField>
        <form.AppField name="consent" validators={{ onChange: zNewsSubscriptionUpsertValues.shape.consent }}>
          {(f) => <f.CheckboxField label={bundle.newsletterConsent.content} />}
        </form.AppField>

        <form.Submit ref={submitRef} icon="icon-[line-md--email-plus]" intent="secondary" label="M’inscrire" className={FORM.submit()} />
      </form.AppForm>
    </form>
  );
}
type NewsletterFormProps = { bundle: NewsletterLegalBundles["Entity"]; className?: string; formState: ServerFormState };
