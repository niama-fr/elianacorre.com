import { CACHE_ROUTE_HEADERS } from "@ec/http/cache-policy";
import { Button } from "@ec/ui/components/button";
import { HeroInfo, type HeroInfoProps } from "@ec/ui/components/hero-info";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ec/ui/components/tooltip";
import { z } from "@ec/validation/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { getEbookDownloadUrl } from "@/lib/newsletter/urls";
import { noindexHead } from "@/seo/head";

import { EbookRecoveryFormDialog } from "./-ebook-recovery-form-dialog";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const zSearch = z.object({ token: z.string().optional() });

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/newsletter/ebook")({
  component: NewsletterEbookPage,
  head: () => noindexHead("Votre e-book — Eliana Corré"),
  headers: () => CACHE_ROUTE_HEADERS.private,
  validateSearch: zSearch,
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function NewsletterEbookPage() {
  const { token } = Route.useSearch();
  const downloadUrl = token ? getEbookDownloadUrl(token) : null;

  useEffect(() => {
    if (downloadUrl) window.location.replace(downloadUrl);
  }, [downloadUrl]);

  const info: HeroInfoProps = downloadUrl
    ? {
        btn: {
          children: "Télécharger l'e-book",
          href: downloadUrl,
          icon: "icon-[tabler--book-download]",
          kind: "external",
          referrerPolicy: "no-referrer",
        },
        content: [`Si le téléchargement ne démarre pas automatiquement, utilisez le bouton ci-dessous.`],
        title: ["Votre téléchargement", "va commencer"],
      }
    : {
        content: [
          `Il a peut-être expiré ou n’est plus utilisable.`,
          `Vous pouvez demander un nouveau lien personnel sans vous réinscrire à la newsletter.`,
        ],
        title: ["Ce lien", "n’est plus valide"],
      };

  return (
    <HeroInfo {...info}>
      {downloadUrl ? null : (
        <>
          <Tooltip>
            <TooltipTrigger render={<Button size="icon-lg" render={<Link to="/" />} nativeButton={false} />}>
              <span className="icon-[tabler--home] size-5" />
            </TooltipTrigger>
            <TooltipContent>Retourner à l&apos;accueil</TooltipContent>
          </Tooltip>
          <EbookRecoveryFormDialog />
        </>
      )}
    </HeroInfo>
  );
}
