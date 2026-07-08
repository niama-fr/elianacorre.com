import { convexQuery } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import { readRootLayout } from "@ec/domain/helpers/layouts";
import { Alert } from "@ec/ui/components/alert";
import { Button } from "@ec/ui/components/button";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { Header } from "@/routes/_public/-header";
import { NewsletterForm } from "@/routes/_public/-newsletter-form";

import styleCss from "@/styles/public.css?url";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  head: () => ({
    links: [{ href: styleCss, rel: "stylesheet" }],
  }),
  loader: async ({ context }) => {
    const layout = readRootLayout();
    const bundle = await context.queryClient.ensureQueryData(convexQuery(api.newsletterLegalBundles.requireActive));
    return { bundle, layout };
  },
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function PublicLayout() {
  const { bundle, layout } = Route.useLoaderData();

  return (
    <>
      <GridBackground />
      <Header {...layout} />
      <main className="relative mt-20 flex-1 sm:mt-28 md:mt-40">
        <Outlet />
      </main>
      <Section intent="secondary">
        <SectionMain>
          <SectionTitle title={["Le carnet", "du quotidien"]} direction="row" />
          <div className="flex flex-col gap-16 sm:flex-row">
            <SectionContent className="flex-1 gap-4">
              <p>
                Inscris-toi à ma newsletter “le carnet du quotidien” et reçois l'ebook Commencer son carnet de voyage en cadeau, puis chaque
                mois, un mail personnel pour t'inspirer et nourrir ta pratique et te rappeler que la beauté du quotidien mérite d'être
                capturée.
              </p>
              <Alert className="bg-secondary/30 border-none  text-xs px-3 py-2 text-pretty">
                Vos données sont utilisées pour confirmer votre adresse, vous envoyer la lettre et vous délivrer l’e-book de bienvenue.
                <Link className="contents hover:text-amber-800" to="/confidentialite">
                  {" "}
                  En savoir plus dans la politique de confidentialité
                </Link>
              </Alert>
            </SectionContent>
            <div className="flex-1">
              <NewsletterForm bundle={bundle} />
            </div>
          </div>
        </SectionMain>
      </Section>
      <section className="relative flex items-center justify-between bg-neutral-700 px-4 py-2 text-white">
        <span>© 2025 Eliana Corré</span>
        <div className="flex gap-2">
          <Button render={<Link to="/confidentialite" />} variant="ghost" nativeButton={false}>
            Confidentialité
          </Button>
          <Button render={<Link to="/mentions-legales" />} variant="ghost" nativeButton={false}>
            Mentions légales
          </Button>
        </div>
      </section>
    </>
  );
}
