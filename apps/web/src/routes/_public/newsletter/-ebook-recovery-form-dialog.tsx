import { zEbookRecoveryRequestValues } from "@ec/domain/schemas/ebook-recoveries";
import { Alert, AlertDescription } from "@ec/ui/components/alert";
import { Btn } from "@ec/ui/components/btn";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@ec/ui/components/dialog";
import { useAppForm } from "@ec/ui/hooks/public-form";
import { useMutation } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { useState } from "react";
import { toast } from "sonner";

import { requestEbookRecovery } from "@/lib/newsletter/functions";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const EBOOK_RECOVERY_FORM_DIALOG = {
  alert: cva("bg-primary/30 border-none px-3 py-2"),
  alertDescription: cva("text-xs text-pretty"),
  content: cva("sm:max-w-sm"),
  description: cva("text-justify text-pretty"),
  title: cva("flex items-center gap-1"),
  titleIcon: cva("icon-[tabler--book-2] size-6"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function EbookRecoveryFormDialog() {
  const [open, setOpen] = useState(false);
  const requestEbookRecoveryMutation = useMutation({ mutationFn: requestEbookRecovery });
  const form = useAppForm({
    defaultValues: { email: "", website: "" },
    onSubmit: async ({ value: data }) => {
      try {
        await requestEbookRecoveryMutation.mutateAsync({ data });
        setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Btn kind="button" icon="icon-[tabler--book-download]">
            Recevoir un nouveau lien
          </Btn>
        }
      />
      <DialogContent className={EBOOK_RECOVERY_FORM_DIALOG.content()}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppForm>
            <DialogHeader>
              <DialogTitle className={EBOOK_RECOVERY_FORM_DIALOG.title()}>
                <span className={EBOOK_RECOVERY_FORM_DIALOG.titleIcon()} />
                E-book de bienvenue
              </DialogTitle>
              <DialogDescription className={EBOOK_RECOVERY_FORM_DIALOG.description()}>
                Si vous avez déjà été inscrit·e à ma gazette itinérante, vous pouvez recevoir un nouveau lien vers l’e-book de bienvenue.
              </DialogDescription>
            </DialogHeader>
            <form.AppField name="email" validators={{ onChange: zEbookRecoveryRequestValues.shape.email }}>
              {(f) => <f.InputField label="Adresse e-mail" type="email" />}
            </form.AppField>
            <form.AppField name="website" validators={{ onChange: zEbookRecoveryRequestValues.shape.website }}>
              {(f) => (
                <div aria-hidden="true" className="sr-only">
                  <f.InputField autoComplete="off" label="Laissez ce champ vide" tabIndex={-1} type="text" />
                </div>
              )}
            </form.AppField>
            <DialogFooter>
              <form.Submit label="Recevoir un nouveau lien" icon="icon-[tabler--book-download]" className={{ base: "max-w-xs" }} />
            </DialogFooter>
            <Alert className={EBOOK_RECOVERY_FORM_DIALOG.alert()}>
              <AlertDescription className={EBOOK_RECOVERY_FORM_DIALOG.alertDescription()}>
                - Vous ne serez pas réinscrit·e si vous ne l&apos;êtes plus.
              </AlertDescription>
              <AlertDescription className={EBOOK_RECOVERY_FORM_DIALOG.alertDescription()}>
                - Votre dernier contact lié à l’e-book doit dater de moins de 3 ans.
              </AlertDescription>
            </Alert>
          </form.AppForm>
        </form>
      </DialogContent>
    </Dialog>
  );
}
