import { HeroInfo, type HeroInfoProps } from "@ec/ui/components/hero-info";
import { createFileRoute } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/$")({
  component: NotFoundPage,
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function NotFoundPage() {
  const info: HeroInfoProps = {
    btn: { children: "Retourner à l'accueil", icon: "icon-[lucide--home]", kind: "link", to: "/" },
    content: [
      "Cette page semble encore sur l’e-tabli. Un croquis oublié, une trace de pastel, peut-être une idée partie sécher ailleurs…",
      "En attendant qu’elle prenne forme, vous pouvez revenir à l’accueil.",
    ],
    title: ["Page en cours", " d’esquisse"],
  };

  return <HeroInfo {...info} />;
}
