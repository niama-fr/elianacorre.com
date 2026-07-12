import { HeroInfo, type HeroInfoProps } from "@ec/ui/components/hero-info";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import z from "zod";

import { getEbookDownloadUrl } from "@/lib/newsletter/urls";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const zSearch = z.object({ token: z.string().optional() });

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/newsletter/ebook")({
  component: NewsletterEbookPage,
  head: () => ({ meta: [{ content: "no-referrer", name: "referrer" }, { title: "Votre e-book — Eliana Corré" }] }),
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
          icon: "icon-[lucide--download]",
          kind: "external",
          referrerPolicy: "no-referrer",
        },
        content: [`Si le téléchargement ne démarre pas automatiquement, utilisez le bouton ci-dessous.`],
        title: ["Votre téléchargement", "va commencer"],
      }
    : {
        btn: {
          children: "Recevoir un nouveau lien",
          icon: "icon-[lucide--mail]",
          kind: "link",
          to: "/newsletter/recuperer-ebook",
        },
        content: [
          `Il a peut-être expiré ou été remplacé par une demande plus récente.`,
          `Vous pouvez demander un nouveau lien personnel sans vous réinscrire à la newsletter.`,
        ],
        title: ["Ce lien n’est", "plus valide"],
      };

  return <HeroInfo {...info} />;
}
