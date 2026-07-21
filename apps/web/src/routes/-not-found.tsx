import { HeroInfo, type HeroInfoProps } from "@ec/ui/components/hero-info";

export function NotFoundPage() {
  const info: HeroInfoProps = {
    btn: { children: "Retourner à l'accueil", icon: "icon-[lucide--home]", kind: "link", to: "/" },
    content: [
      "Cette page semble encore sur l’établi. Un croquis oublié, une trace de pastel, peut-être une idée partie sécher ailleurs…",
      "En attendant qu’elle prenne forme, vous pouvez revenir à l’accueil.",
    ],
    title: ["Page", "introuvable"],
  };

  return <HeroInfo {...info} />;
}
