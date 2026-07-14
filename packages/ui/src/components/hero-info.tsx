import { Alert, AlertDescription, AlertTitle } from "@ec/ui/components/alert";
import { Btn, type BtnProps } from "@ec/ui/components/btn";
import type { HeroProps } from "@ec/ui/components/hero";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const HERO_INFO = {
  alert: cva(`group/alert data-[variant=success]:bg-emerald-50 data-[variant=success]:text-emerald-900 
  data-[variant=warning]:bg-amber-50 data-[variant=warning]:text-amber-900`),
  alertIcon: cva(`group-data-[variant=success]/alert:icon-[lucide--check-circle-2] 
    group-data-[variant=warning]/alert:icon-[lucide--alert-triangle]`),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function HeroInfo({ alert, btn: maybeBtn, children, content, title }: HeroInfoProps) {
  const btn = maybeBtn ?? { children: "Retourner à l'accueil", icon: "icon-[lucide--home]", kind: "link", to: "/" };
  return (
    <Hero title={title}>
      <HeroContent pretty>
        {content.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {alert && (
          <Alert className={HERO_INFO.alert()} data-variant={alert.variant ?? "info"}>
            <svg className={HERO_INFO.alertIcon()} />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription>{alert.description}</AlertDescription>
          </Alert>
        )}
      </HeroContent>
      <div className="w-full justify-end items-center flex gap-2">{children ?? <Btn {...btn} />}</div>
    </Hero>
  );
}
export type HeroInfoProps = React.PropsWithChildren<{
  alert?: { title: string; description: string; variant?: "info" | "success" | "warning" };
  btn?: BtnProps;
  content: string[];
  title: HeroProps["title"];
}>;
