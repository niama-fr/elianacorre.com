import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import type { NewsletterLegalBundles } from "@ec/domain/schemas/newsletter-legal-bundles";
import { zNewsletterSubCreateValues } from "@ec/domain/schemas/newsletter-subs";
import { Alert, AlertDescription, AlertTitle } from "@ec/ui/components/alert";
import { Btn } from "@ec/ui/components/btn";
import { Input } from "@ec/ui/components/input";
import { LoadingSwap } from "@ec/ui/components/loading-swap";
import { useAppForm } from "@ec/ui/hooks/public-form";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function NewsletterForm({ bundle }: { bundle: NewsletterLegalBundles["Entity"] }) {
  const [submitted, setSubmitted] = useState(false);
  const upsertNewsletterSub = useMutation({ mutationFn: useConvexMutation(api.newsletterSubs.upsert) });

  const form = useAppForm({
    defaultValues: { consent: false, email: "", firstName: "" },
    onSubmit: async ({ value }) => {
      if (!value.consent) return;
      try {
        await upsertNewsletterSub.mutateAsync({ ...value, consent: true });
        form.reset();
        setSubmitted(true);
      } catch {
        toast.error("La demande n’a pas pu être envoyée. Veuillez réessayer dans quelques instants.");
      }
    },
  });

  if (submitted)
    return (
      <Alert className="bg-white">
        <AlertTitle>Vérifiez votre messagerie</AlertTitle>
        <AlertDescription>
          Si une action est nécessaire pour cette adresse, vous recevrez prochainement un e-mail. Pensez à vérifier votre dossier de
          courriers indésirables. Les liens de confirmation restent valables pendant 24 heures.
        </AlertDescription>
      </Alert>
    );

  return (
    <form
      className="flex w-full max-w-2xl flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="email" validators={{ onChange: zNewsletterSubCreateValues.shape.email }}>
        {(field) => <field.InputField label="Adresse e-mail" type="email" />}
      </form.AppField>
      <form.AppField name="firstName">{(field) => <field.InputField label="Prénom (facultatif)" type="text" />}</form.AppField>
      <form.Field name="consent" validators={{ onChange: zNewsletterSubCreateValues.shape.consent }}>
        {(field) => {
          const isInvalid = form.state.submissionAttempts > 0 && !field.state.meta.isValid;
          return (
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-3 text-left" htmlFor={field.name}>
                <Input
                  aria-invalid={isInvalid}
                  checked={field.state.value}
                  className="mt-1 size-4 shrink-0 rounded"
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.checked);
                  }}
                  type="checkbox"
                />
                <span>{bundle.newsletterConsent.content}</span>
              </label>
              {isInvalid ? <p className="text-sm text-destructive">Vous devez accepter de recevoir la lettre.</p> : null}
            </div>
          );
        }}
      </form.Field>
      <details className="rounded-lg border bg-white/70 p-4 text-left text-sm">
        <summary className="cursor-pointer font-semibold">Comment vos données sont-elles utilisées ?</summary>
        <p className="mt-4 whitespace-pre-line">{bundle.privacyNotice.content}</p>
      </details>
      <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
        {({ canSubmit, isSubmitting }) => (
          <Btn className={{ base: "self-end" }} disabled={!canSubmit || isSubmitting} type="submit">
            <LoadingSwap isLoading={isSubmitting}>M’inscrire et recevoir l’e-book</LoadingSwap>
          </Btn>
        )}
      </form.Subscribe>
    </form>
  );
}
