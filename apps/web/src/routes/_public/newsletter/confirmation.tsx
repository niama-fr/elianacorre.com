import { HeroInfo, type HeroInfoProps } from "@ec/ui/components/hero-info";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { confirmNewsletter } from "@/lib/newsletter/newsletter.functions";
import { getEbookDownloadUrl } from "@/lib/newsletter/urls";
import { createNoindexHead } from "@/lib/seo";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const zSearch = z.object({ token: z.string().optional() });

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
// oxlint-disable-next-line sort-keys
export const Route = createFileRoute("/_public/newsletter/confirmation")({
  component: NewsletterConfirmationPage,
  head: () => createNoindexHead("Confirmation — Eliana Corré"),
  loaderDeps: ({ search: { token } }) => ({ token }),
  loader: async ({ deps: { token } }) => {
    if (!token) return { confirmed: false, downloadToken: null } as const;
    return await confirmNewsletter({ data: { token } });
  },
  validateSearch: zSearch,
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function NewsletterConfirmationPage() {
  const { confirmed, downloadToken } = Route.useLoaderData();

  const info: HeroInfoProps = confirmed
    ? {
        alert: downloadToken
          ? {
              description: "Ce lien est personnel et valable pendant 72 heures. Un autre lien vous sera aussi envoyé par e-mail.",
              title: "Vous pouvez dés maintenant télécharger l’e-book de bienvenue.",
              variant: "success",
            }
          : {
              description:
                "L’e-book est temporairement indisponible, mais votre inscription est bien validée. Vous pourrez refaire une demande depuis la section newsletter plus tard.",
              title: "L’e-book est temporairement indisponible",
              variant: "warning",
            },
        btn: downloadToken
          ? {
              children: "Télécharger l'e-book",
              href: getEbookDownloadUrl(downloadToken),
              icon: "icon-[lucide--download]",
              kind: "external",
              referrerPolicy: "no-referrer",
            }
          : undefined,
        content: ["Merci et bienvenue. Votre inscription à la newsletter est bien confirmée !"],
        title: ["Votre inscription", "est confirmée"],
      }
    : {
        content: [
          `Il a peut-être expiré ou été remplacé par une demande plus récente.`,
          `N'hésitez pas à obtenir un nouveau lien personnel en réitérant votre démarche d'inscription depuis la section newsletter.`,
        ],
        title: ["Ce lien", "n’est plus valide"],
      };

  return <HeroInfo {...info} />;
}
