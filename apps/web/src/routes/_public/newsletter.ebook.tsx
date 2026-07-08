import { BTN, BtnContent } from "@ec/ui/components/btn";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { getEbookDownloadUrl } from "@/lib/newsletter/urls";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/newsletter/ebook")({
  component: NewsletterEbookPage,
  head: () => ({ meta: [{ content: "no-referrer", name: "referrer" }, { title: "Votre e-book — Eliana Corré" }] }),
  validateSearch: (search) => ({ token: typeof search.token === "string" ? search.token : "" }),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function NewsletterEbookPage() {
  const { token } = Route.useSearch();
  const downloadUrl = token === "" ? null : getEbookDownloadUrl(token);

  useEffect(() => {
    if (downloadUrl !== null) window.location.replace(downloadUrl);
  }, [downloadUrl]);

  if (downloadUrl === null)
    return (
      <Section intent="secondary">
        <SectionMain>
          <SectionTitle title={["Ce lien n’est", "plus valide"]} />
          <SectionContent className="max-w-3xl text-left">
            <p>Demandez un nouveau lien personnel depuis la page d’inscription.</p>
          </SectionContent>
          <Link className={BTN.base()} to="/newsletter">
            <BtnContent>Demander un nouveau lien</BtnContent>
          </Link>
        </SectionMain>
      </Section>
    );

  return (
    <Section intent="secondary">
      <SectionMain>
        <SectionTitle title={["Votre téléchargement", "va commencer"]} />
        <SectionContent className="max-w-3xl text-left">
          <p>Si le téléchargement ne démarre pas automatiquement, utilisez le bouton ci-dessous.</p>
        </SectionContent>
        <a className={BTN.base()} href={downloadUrl} referrerPolicy="no-referrer">
          <BtnContent>Télécharger l’e-book</BtnContent>
        </a>
      </SectionMain>
    </Section>
  );
}
