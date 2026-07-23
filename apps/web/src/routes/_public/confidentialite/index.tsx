import { Hero, HeroContent } from "@ec/ui/components/hero";
import { createFileRoute } from "@tanstack/react-router";

import { createSeoHead } from "@/lib/seo";
import { Route as PublicLayoutRoute } from "@/routes/_public";

import { PrivacyNoticeMarkdown } from "./-privacy-notice-markdown";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/confidentialite/")({
  component: PrivacyPolicyPage,
  head: () =>
    createSeoHead({
      description: "Politique de confidentialité du site elianacorre.com et de la lettre d’Eliana Corré.",
      path: "/confidentialite",
      title: "Politique de confidentialité — Eliana Corré",
    }),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function PrivacyPolicyPage() {
  const { bundle } = PublicLayoutRoute.useLoaderData();
  return (
    <Hero title={["Politique de", "confidentialité"]}>
      <HeroContent className="z-10 items-start text-pretty border bg-white p-10 text-start shadow-2xl">
        <PrivacyNoticeMarkdown content={bundle.privacyNotice.content} />
      </HeroContent>
    </Hero>
  );
}
