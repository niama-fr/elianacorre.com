import { readIndexPage } from "@ec/domain/helpers/pages";
import { Alert, AlertDescription } from "@ec/ui/components/alert";
import { Card, CardContent } from "@ec/ui/components/card";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import { createFileRoute, Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import { ContactForm } from "@/routes/_public/contact/-form";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/contact/")({
  component: ContactPage,
  loader: () => readIndexPage(),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const PAGE = {
  alert: cva("max-w-lg bg-primary/10 border-none px-3 py-2"),
  alertDescription: cva("text-xs text-pretty text-foreground"),
  alertLink: cva("underline"),
  card: cva("bg-primary/40 ring-0 w-full max-w-lg"),
  content: cva("items-center lg:items-start"),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function ContactPage() {
  const { contact } = Route.useLoaderData();
  return (
    <Hero title={contact.title} image={contact.image}>
      <HeroContent className={PAGE.content()}>
        {contact.content}
        <Card className={PAGE.card()}>
          <CardContent>
            <ContactForm />
          </CardContent>
        </Card>
        <Alert className={PAGE.alert()}>
          <AlertDescription className={PAGE.alertDescription()}>
            Les informations envoyées sont utilisées uniquement pour répondre à ta demande.{" "}
            <Link className={PAGE.alertLink()} to="/confidentialite">
              Tu peux en savoir plus ici
            </Link>
            .
          </AlertDescription>
        </Alert>
      </HeroContent>
    </Hero>
  );
}
