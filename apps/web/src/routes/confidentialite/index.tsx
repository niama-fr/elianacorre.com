import { Hero, HeroContent } from "@ec/ui/components/hero";
import { createFileRoute } from "@tanstack/react-router";

import { Route as RootRoute } from "@/routes/__root";
import { seoHead } from "@/seo/head";

import { PrivacyNoticeMarkdown } from "./-privacy-notice-markdown";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/confidentialite/")({
  component: PrivacyPolicyPage,
  head: () =>
    seoHead({
      description: "Politique de confidentialité du site elianacorre.com et de la lettre d’Eliana Corré.",
      path: "/confidentialite",
      title: "Politique de confidentialité — Eliana Corré",
    }),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function PrivacyPolicyPage() {
  const { privacyNotice } = RootRoute.useLoaderData();
  return (
    <Hero title={["Politique de", "confidentialité"]}>
      <HeroContent className="z-10 items-start text-pretty border bg-white p-10 text-start shadow-2xl">
        <PrivacyNoticeMarkdown content={privacyNotice.content} />
      </HeroContent>
    </Hero>
  );
}
