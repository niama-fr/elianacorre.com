import { convexQuery } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/mentions-legales/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const bundle = await context.queryClient.ensureQueryData(convexQuery(api.newsletterLegalBundles.requireActive));
    return { bundle };
  },
});

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
function RouteComponent() {
  const { bundle } = Route.useLoaderData();

  return (
    <>
      <Section>
        <SectionMain className="lg:items-center">
          <SectionTitle className={{ title: "flex-row gap-2" }} title={["Mentions", "légales"]} />
          <SectionContent className="z-10 mt-8 -mb-12 items-start text-pretty border bg-white p-10 text-start shadow-2xl">
            <p>
              Le site internet{" "}
              <a className="font-bold text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              est édité par :
            </p>
            <ul>
              <li className="flex items-baseline gap-2">
                <div className="flex w-28 flex-none items-center gap-2">
                  <span className="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Nom :</strong>
                </div>
                Eliana Corré
              </li>
              <li className="flex items-baseline gap-2">
                <div className="flex w-28 flex-none items-center gap-2">
                  <span className="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Courriel :</strong>
                </div>
                <a className="underline hover:text-primary" href="mailto:me@elianacorre.com">
                  me@elianacorre.com
                </a>
              </li>
              <li className="flex items-baseline gap-2">
                <div className="flex w-28 flex-none items-center gap-2">
                  <span className="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Adresse :</strong>
                </div>
                <div className="flex flex-col items-start">
                  <p>1A rue Gérard de Nerval</p>
                  <p>97430 Trois Mares - REUNION</p>
                </div>
              </li>
            </ul>
            <p>
              Le directeur de la publication est : <strong>Eliana Corré</strong>.
            </p>
            <p>
              Le site internet{" "}
              <a className="font-bold text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              est hébergé par :
            </p>
            <ul>
              <li className="flex items-baseline gap-2">
                <div className="flex w-28 flex-none items-center gap-2">
                  <span className="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Nom :</strong>
                </div>
                Cloudflare, Inc.
              </li>
              <li className="flex items-baseline gap-2">
                <div className="flex w-28 flex-none items-center gap-2">
                  <span className="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Courriel :</strong>
                </div>
                <a className="underline hover:text-primary" href="https://www.cloudflare.com">
                  cloudflare.com
                </a>
              </li>
              <li className="flex items-baseline gap-2">
                <div className="flex w-28 flex-none items-center gap-2">
                  <span className="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Adresse :</strong>
                </div>
                <div className="flex flex-col items-start">
                  <p>101 Townsend St</p>
                  <p>San Francisco, CA 94107 - ETATS-UNIS</p>
                </div>
              </li>
            </ul>
            <p>
              Le site internet{" "}
              <a className="font-bold text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              est soumis à la loi française.
            </p>
          </SectionContent>
        </SectionMain>
      </Section>
      <Section className={{ base: "pt-8" }} intent="secondary">
        <SectionMain>
          <SectionTitle className={{ title: "flex-row gap-2 sm:text-4xl 2xl:text-4xl" }} title={["Propriété", "intellectuelle"]} />
          <SectionContent className="text-pretty text-start">
            <p>
              Tous les éléments du site internet{" "}
              <a className="underline hover:text-secondary" href="http://elianacorre.com">
                elianacorre.com
              </a>
              , qu&apos;ils soient visuels ou sonores, y compris la technologie sous-jacente, sont protégés par le droit d&apos;auteur, des
              marques ou des brevets.
            </p>
          </SectionContent>
        </SectionMain>
      </Section>
      <Section intent="primary">
        <SectionMain>
          <SectionTitle className={{ title: "flex-row gap-2 sm:text-4xl 2xl:text-4xl" }} title={["Liens", "hypertextes"]} />
          <SectionContent className="gap-2 text-pretty text-start">
            <p>
              Le site internet{" "}
              <a className="underline hover:text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              peut contenir des liens hypertextes pointant vers d&apos;autres sites internet.{" "}
            </p>
            <p>
              Eliana Corré ne peut être tenue responsable du contenu de ces sites et décline toute responsabilité quant aux informations qui
              y sont présentées.
            </p>
          </SectionContent>
        </SectionMain>
      </Section>
      <Section intent="secondary">
        <SectionMain>
          <SectionTitle className={{ title: "flex-row gap-2 sm:text-4xl 2xl:text-4xl" }} title={["Données", "personnelles"]} />
          <SectionContent className="gap-2 text-pretty text-start">
            <p>
              Eliana Corré traite les données personnelles uniquement pour les finalités présentées au moment de leur collecte. Les
              informations nécessaires au formulaire de contact servent à répondre à la demande envoyée. Une inscription à la lettre repose
              séparément sur le consentement explicite de la personne.
            </p>
            <h3 className="mt-6 text-2xl font-bold">Lettre et e-book de bienvenue</h3>
            <p className="whitespace-pre-line">{bundle.privacyNotice.content}</p>
          </SectionContent>
        </SectionMain>
      </Section>
    </>
  );
}
