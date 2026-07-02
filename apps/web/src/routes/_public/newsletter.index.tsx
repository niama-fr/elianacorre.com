import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute } from "@tanstack/react-router";

import { NewsletterForm } from "./newsletter/-form";

export const Route = createFileRoute("/_public/newsletter/")({
  component: NewsletterPage,
  head: () => ({ meta: [{ title: "Lettre et e-book — Eliana Corré" }] }),
});

function NewsletterPage() {
  return (
    <Section intent="secondary">
      <SectionMain>
        <SectionTitle title={["Recevez mes lettres", "et mon e-book"]} />
        <SectionContent className="max-w-3xl text-left">
          <p>Je partage environ une fois par mois mes nouvelles, mes réflexions et les coulisses de mon travail.</p>
          <p>Inscrivez-vous pour recevoir mes prochaines lettres ainsi que mon e-book de bienvenue.</p>
          <p>Aucun compte ne sera créé. Vous devrez confirmer votre adresse e-mail avant de recevoir l’e-book.</p>
        </SectionContent>
        <NewsletterForm />
      </SectionMain>
    </Section>
  );
}
