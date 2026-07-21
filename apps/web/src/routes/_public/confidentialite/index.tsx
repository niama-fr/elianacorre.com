import { convexQuery } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import { createFileRoute } from "@tanstack/react-router";

import { createSeoHead } from "@/lib/seo";

import { PrivacyNoticeMarkdown } from "./-privacy-notice-markdown";

export const Route = createFileRoute("/_public/confidentialite/")({
  component: PrivacyPolicyPage,
  head: readPrivacyPolicyHead,
  loader: async ({ context }) =>
    await loadPrivacyPolicy(async () => await context.queryClient.ensureQueryData(convexQuery(api.newsletterLegalBundles.requireActive))),
});

export function readPrivacyPolicyHead() {
  return createSeoHead({
    description: "Politique de confidentialité du site elianacorre.com et de la lettre d’Eliana Corré.",
    path: "/confidentialite",
    title: "Politique de confidentialité — Eliana Corré",
  });
}

export async function loadPrivacyPolicy<Bundle>(loadActiveBundle: () => Promise<Bundle>) {
  const bundle = await loadActiveBundle();
  return { bundle };
}

export function PrivacyPolicyPage() {
  const { bundle } = Route.useLoaderData();

  return (
    <Hero title={["Politique de", "confidentialité"]}>
      <HeroContent className="z-10 items-start text-pretty border bg-white p-10 text-start shadow-2xl">
        <PrivacyNoticeMarkdown content={bundle.privacyNotice.content} />
      </HeroContent>
    </Hero>
  );
}
