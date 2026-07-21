import type { NewsletterLegalBundles } from "@ec/domain/schemas/newsletter-legal-bundles";
import { Alert, AlertDescription } from "@ec/ui/components/alert";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { Link, useNavigate } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { useOnInView } from "react-intersection-observer";

import { NewsletterForm } from "@/routes/_public/-newsletter.form";

export const getNewsletterHashNavigation = (inView: boolean) => ({
  hash: inView ? "la-gazette-itinerante" : "",
  hashScrollIntoView: false,
  replace: true,
  resetScroll: false,
  search: true as const,
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const NEWSLETTER = {
  alert: cva("bg-secondary/30 border-none px-3 py-2"),
  alertDescription: cva("text-xs text-pretty text-foreground"),
  alertLink: cva("underline"),
  badge: cva("text-white px-2 font-medium bg-secondary rounded-2xl"),
  content: cva(`text-center
  sm:text-justify
  md:flex-row 
  xl:gap-24 
  2xl:gap-40`),
  form: cva("flex-1"),
  main: cva("flex-1 flex flex-col gap-4"),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function Newsletter({ bundle }: NewsletterProps) {
  const navigate = useNavigate();
  const ref = useOnInView((inView) => void navigate(getNewsletterHashNavigation(inView)));

  return (
    <Section id="la-gazette-itinerante" ref={ref} intent="secondary">
      <SectionMain>
        <SectionTitle title={["La gazette", "itinérante"]} direction="row" intent="secondary" />
        <SectionContent className={NEWSLETTER.content()}>
          <div className={NEWSLETTER.main()}>
            <p>
              Inscris-toi à ma newsletter <span className={NEWSLETTER.badge()}>La gazette itinérante</span> et reçois l&apos;e-book{" "}
              <span className={NEWSLETTER.badge()}>Commencer son carnet de voyage</span> en cadeau, puis chaque mois, un e-mail personnel
              pour t&apos;inspirer, nourrir ta pratique et te rappeler que la beauté du quotidien mérite d&apos;être capturée.
            </p>
            <Alert className={NEWSLETTER.alert()}>
              <AlertDescription className={NEWSLETTER.alertDescription()}>
                Tes données sont utilisées pour confirmer ton adresse, t&apos;envoyer la gazette et te délivrer l&apos;e-book de bienvenue.
                <Link className={NEWSLETTER.alertLink()} to="/confidentialite">
                  {" "}
                  Tu peux en savoir plus ici
                </Link>
                .
              </AlertDescription>
            </Alert>
          </div>
          <NewsletterForm bundle={bundle} className={NEWSLETTER.form()} />
        </SectionContent>
      </SectionMain>
    </Section>
  );
}
type NewsletterProps = { bundle: NewsletterLegalBundles["Entity"] };
