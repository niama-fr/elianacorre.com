import { Hero, HeroContent } from "@ec/ui/components/hero";
import { createFileRoute } from "@tanstack/react-router";

import { EbookRecoveryForm } from "@/routes/_public/newsletter/-ebook-recovery-form";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/newsletter/recuperer-ebook")({
  component: EbookRecoveryPage,
  head: () => ({ meta: [{ title: "Recevoir un nouveau lien — Eliana Corré" }] }),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function EbookRecoveryPage() {
  return (
    <Hero title={["Recevoir", "un nouveau lien"]}>
      <HeroContent pretty>
        <p>Indiquez votre adresse e-mail pour recevoir un nouveau lien personnel vers l&apos;e-book de bienvenue.</p>
        <p>Le lien reste valable pendant 72 heures.</p>
      </HeroContent>
      <EbookRecoveryForm />
    </Hero>
  );
}
