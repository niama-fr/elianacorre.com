import { BTN, BtnContent } from "@ec/ui/components/btn";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute, Link } from "@tanstack/react-router";

import { confirmNewsletterSub } from "@/lib/newsletter/functions";
import { getEbookDownloadUrl } from "@/lib/newsletter/urls";

const readToken = (search: unknown): string => {
  if (typeof search !== "object" || search === null || !("token" in search)) return "";
  return typeof search.token === "string" ? search.token : "";
};

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/newsletter/confirmation")({
  component: NewsletterConfirmationPage,
  head: () => ({ meta: [{ content: "no-referrer", name: "referrer" }, { title: "Confirmation — Eliana Corré" }] }),
  loader: async ({ location }) => {
    const token = readToken(location.search);
    return token === "" ? ({ downloadToken: null, status: "invalid" } as const) : await confirmNewsletterSub({ data: { token } });
  },
  validateSearch: (search) => ({ token: readToken(search) }),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function NewsletterConfirmationPage() {
  const { downloadToken, status } = Route.useLoaderData();

  if (status === "confirmed")
    return (
      <Section intent="secondary">
        <SectionMain>
          <SectionTitle title={["Votre inscription", "est confirmée"]} />
          <SectionContent className="max-w-3xl text-left">
            <p>Merci et bienvenue. Votre inscription à la newsletter est bien confirmée.</p>

            {downloadToken ? (
              <>
                <p>Vous pouvez dès maintenant télécharger l’e-book de bienvenue.</p>
                <p>Ce lien est personnel et valable pendant 72 heures. Un autre lien vous sera également envoyé par e-mail.</p>
              </>
            ) : (
              <p>
                L’e-book est temporairement indisponible, mais votre inscription est bien validée. Vous pourrez refaire une demande depuis
                la page newsletter plus tard.
              </p>
            )}
          </SectionContent>

          {downloadToken && (
            <a className={BTN.base()} href={getEbookDownloadUrl(downloadToken)} referrerPolicy="no-referrer">
              <BtnContent>Télécharger l’e-book</BtnContent>
            </a>
          )}
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
