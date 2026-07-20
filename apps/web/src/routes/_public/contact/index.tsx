import { readIndexPage } from "@ec/domain/helpers/pages";
import { Card, CardContent } from "@ec/ui/components/card";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import { createFileRoute } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import { ContactForm } from "@/routes/_public/contact/-form";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/contact/")({
  component: ContactPage,
  loader: () => readIndexPage(),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const PAGE = {
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
      </HeroContent>
    </Hero>
  );
}
