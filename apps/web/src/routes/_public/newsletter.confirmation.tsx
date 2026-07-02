import { BTN, BtnContent } from "@ec/ui/components/btn";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute, Link } from "@tanstack/react-router";

import { confirmNewsletterSubscription } from "@/lib/newsletter/functions";
import { getEbookDownloadUrl } from "@/lib/newsletter/urls";

const readToken = (search: unknown): string => {
  if (typeof search !== "object" || search === null || !("token" in search)) return "";
  return typeof search.token === "string" ? search.token : "";
};

export const Route = createFileRoute("/_public/newsletter/confirmation")({
  component: NewsletterConfirmationPage,
  head: () => ({ meta: [{ content: "no-referrer", name: "referrer" }, { title: "Confirmation — Eliana Corré" }] }),
  loader: async ({ location }) => {
    const token = readToken(location.search);
    return token === "" ? ({ status: "invalid" } as const) : await confirmNewsletterSubscription({ data: { token } });
  },
  validateSearch: (search) => ({ token: readToken(search) }),
});

function NewsletterConfirmationPage() {
  const confirmation = Route.useLoaderData();

  if (confirmation.status === "confirmed")
    return (
      <Section intent="secondary">
        <SectionMain>
          <SectionTitle title={["Votre inscription", "est confirmée"]} />
          <SectionContent className="max-w-3xl text-left">
            <p>Merci et bienvenue. Vous pouvez dès maintenant télécharger l’e-book de bienvenue.</p>
            <p>Ce lien est personnel et valable pendant 72 heures. Un autre lien vous sera également envoyé par e-mail.</p>
          </SectionContent>
          <a className={BTN.base()} href={getEbookDownloadUrl(confirmation.token)} referrerPolicy="no-referrer">
            <BtnContent>Télécharger l’e-book</BtnContent>
          </a>
        </SectionMain>
      </Section>
    );

  if (confirmation.status === "unavailable")
    return (
      <Section intent="secondary">
        <SectionMain>
          <SectionTitle title={["L’e-book est", "temporairement indisponible"]} />
          <SectionContent className="max-w-3xl text-left">
            <p>Votre demande n’a pas été finalisée. Veuillez réessayer ce lien dans quelques instants.</p>
          </SectionContent>
        </SectionMain>
      </Section>
    );

  return (
    <Section intent="secondary">
      <SectionMain>
        <SectionTitle title={["Ce lien n’est", "plus valide"]} />
        <SectionContent className="max-w-3xl text-left">
          <p>Il a peut-être expiré ou été remplacé par une demande plus récente.</p>
        </SectionContent>
        <Link className={BTN.base()} to="/newsletter">
          <BtnContent>Demander un nouveau lien</BtnContent>
        </Link>
      </SectionMain>
    </Section>
  );
}
