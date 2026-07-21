import { HeroInfo } from "@ec/ui/components/hero-info";

export function SafeErrorPage() {
  return (
    <HeroInfo
      btn={{ children: "Retourner à l'accueil", icon: "icon-[lucide--home]", kind: "link", to: "/" }}
      content={["Une erreur inattendue est survenue. Vous pouvez revenir à l’accueil et réessayer."]}
      title={["Quelque chose", "s’est mal passé"]}
    />
  );
}
