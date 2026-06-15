import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/section";
import { createFileRoute } from "@tanstack/solid-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/mentions-legales")({
  component: RouteComponent,
});

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
function RouteComponent() {
  return (
    <>
      <Section>
        <SectionMain class="lg:items-center">
          <SectionTitle class={{ title: "flex-row gap-2" }} title={["Mentions", "légales"]} />
          <SectionContent class="z-10 mt-8 -mb-12 items-start text-pretty border bg-white p-10 text-start shadow-2xl">
            <p>
              Le site internet{" "}
              <a class="font-bold text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              est édité par :
            </p>
            <ul>
              <li class="flex items-baseline gap-2">
                <div class="flex w-28 flex-none items-center gap-2">
                  <span class="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Nom :</strong>
                </div>
                Eliana Corré
              </li>
              <li class="flex items-baseline gap-2">
                <div class="flex w-28 flex-none items-center gap-2">
                  <span class="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Courriel :</strong>
                </div>
                <a class="underline hover:text-primary" href="mailto:me@elianacorre.com">
                  me@elianacorre.com
                </a>
              </li>
              <li class="flex items-baseline gap-2">
                <div class="flex w-28 flex-none items-center gap-2">
                  <span class="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Adresse :</strong>
                </div>
                <div class="flex flex-col items-start">
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
              <a class="font-bold text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              est hébergé par :
            </p>
            <ul>
              <li class="flex items-baseline gap-2">
                <div class="flex w-28 flex-none items-center gap-2">
                  <span class="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Nom :</strong>
                </div>
                Cloudflare, Inc.
              </li>
              <li class="flex items-baseline gap-2">
                <div class="flex w-28 flex-none items-center gap-2">
                  <span class="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Courriel :</strong>
                </div>
                <a class="underline hover:text-primary" href="https://www.cloudflare.com">
                  cloudflare.com
                </a>
              </li>
              <li class="flex items-baseline gap-2">
                <div class="flex w-28 flex-none items-center gap-2">
                  <span class="icon-[tabler--circle-filled] size-3 text-primary" />
                  <strong>Adresse :</strong>
                </div>
                <div class="flex flex-col items-start">
                  <p>101 Townsend St</p>
                  <p>San Francisco, CA 94107 - ETATS-UNIS</p>
                </div>
              </li>
            </ul>
            <p>
              Le site internet{" "}
              <a class="font-bold text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              est soumis à la loi française.
            </p>
          </SectionContent>
        </SectionMain>
      </Section>
      <Section class={{ base: "pt-8" }} intent="secondary">
        <SectionMain>
          <SectionTitle class={{ title: "flex-row gap-2 sm:text-4xl 2xl:text-4xl" }} title={["Propriété", "intellectuelle"]} />
          <SectionContent class="text-pretty text-start">
            <p>
              Tous les éléments du site internet{" "}
              <a class="underline hover:text-secondary" href="http://elianacorre.com">
                elianacorre.com
              </a>
              , qu'ils soient visuels ou sonores, y compris la technologie sous-jacente, sont protégés par le droit d'auteur, des marques ou
              des brevets.
            </p>
          </SectionContent>
        </SectionMain>
      </Section>
      <Section intent="primary">
        <SectionMain>
          <SectionTitle class={{ title: "flex-row gap-2 sm:text-4xl 2xl:text-4xl" }} title={["Liens", "hypertextes"]} />
          <SectionContent class="gap-2 text-pretty text-start">
            <p>
              Le site internet{" "}
              <a class="underline hover:text-primary" href="http://elianacorre.com">
                elianacorre.com
              </a>{" "}
              peut contenir des liens hypertextes pointant vers d'autres sites internet.{" "}
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
          <SectionTitle class={{ title: "flex-row gap-2 sm:text-4xl 2xl:text-4xl" }} title={["Données", "personnelles"]} />
          <SectionContent class="gap-2 text-pretty text-start">
            <p>
              Eliana Corré est soucieuse de la protection des données personnelles et s'engage à assurer le meilleur niveau de protection à
              ces données.
            </p>
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD), Eliana Corré vous informe des points suivants :</p>
            <ul class="ml-2">
              <li>
                <span class="icon-[tabler--circle-filled] mr-2 size-2.5 text-secondary" />
                Les données personnelles collectées sur le site internet{" "}
                <a class="underline hover:text-secondary" href="http://elianacorre.com">
                  elianacorre.com
                </a>{" "}
                sont traitées uniquement pour les finalités pour lesquelles elles ont été collectées.
              </li>
              <li>
                <span class="icon-[tabler--circle-filled] mr-2 size-2.5 text-secondary" />
                Eliana Corré ne conserve pas les données personnelles au-delà de la durée nécessaire à la réalisation de ces finalités.
              </li>
              <li>
                <span class="icon-[tabler--circle-filled] mr-2 size-2.5 text-secondary" />
                Les données personnelles collectées sur le site internet{" "}
                <a class="underline hover:text-secondary" href="http://elianacorre.com">
                  elianacorre.com
                </a>{" "}
                sont destinées à l'usage exclusif d'Eliana Corré et ne sont pas communiquées à des tiers.
              </li>
              <li>
                <span class="icon-[tabler--circle-filled] mr-2 size-2.5 text-secondary" />
                Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression des données personnelles vous
                concernant. Pour exercer ce droit, vous pouvez contacter Eliana Corré par email à l'adresse{" "}
                <a class="underline hover:text-secondary" href="mailto:me@elianacorre.com">
                  me@elianacorre.com
                </a>
                .
              </li>
            </ul>
          </SectionContent>
        </SectionMain>
      </Section>
    </>
  );
}
