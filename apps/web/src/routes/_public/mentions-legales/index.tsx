import { Hero, HeroContent } from "@ec/ui/components/hero";
import { createFileRoute, Link } from "@tanstack/react-router";

import { createSeoHead } from "@/lib/seo";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/mentions-legales/")({
  component: LegalNoticesPage,
  head: () =>
    createSeoHead({
      description: "Mentions légales, édition et hébergement du site elianacorre.com.",
      path: "/mentions-legales",
      title: "Mentions légales — Eliana Corré",
    }),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function LegalNoticesPage() {
  return (
    <Hero title={["Mentions", "légales"]}>
      <HeroContent className="z-10 items-start text-pretty border bg-white p-10 text-start shadow-2xl">
        <section>
          <h2 className="mb-3 text-2xl font-bold">Édition du site</h2>
          <p>
            Le site <SiteLink /> est édité par <strong>Eliana Corré</strong>, qui en assure également la direction de la publication.
          </p>
          <address className="mt-3 not-italic">
            107 chemin de ligne, Les Canots
            <br />
            97427 Étang-Salé — La Réunion, France
            <br />
            <a className="underline hover:text-primary" href="mailto:contact@elianacorre.com">
              contact@elianacorre.com
            </a>
            <br />
            <a className="underline hover:text-primary" href="tel:+262692904762">
              +262 (0)692 90 47 62
            </a>
          </address>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <address className="mt-3 not-italic">
            <strong>Cloudflare, Inc.</strong>
            <br />
            101 Townsend St
            <br />
            San Francisco, CA 94107 — États-Unis
            <br />
            <a className="underline hover:text-primary" href="https://www.cloudflare.com">
              www.cloudflare.com
            </a>
          </address>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">Propriété intellectuelle</h2>
          <p>
            Tous les éléments du site <SiteLink />, qu&apos;ils soient visuels ou sonores, y compris la technologie sous-jacente, sont
            protégés par le droit d&apos;auteur, des marques ou des brevets.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">Liens hypertextes</h2>
          <p>
            Le site <SiteLink /> peut contenir des liens hypertextes pointant vers d&apos;autres sites internet. Eliana Corré ne peut être
            tenue responsable du contenu de ces sites et décline toute responsabilité quant aux informations qui y sont présentées.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-bold">Données personnelles</h2>
          <p>
            Les informations relatives aux données traitées, aux finalités, aux durées de conservation et à l’exercice de vos droits sont
            présentées dans la{" "}
            <Link className="underline hover:text-primary" to="/confidentialite">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <p>Le site et les présentes mentions légales sont soumis au droit français.</p>
      </HeroContent>
    </Hero>
  );
}

function SiteLink() {
  return (
    <a className="font-bold text-primary" href="https://elianacorre.com">
      elianacorre.com
    </a>
  );
}
