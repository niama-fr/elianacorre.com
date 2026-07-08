import { readIndexPage } from "@ec/domain/helpers/pages";
import { Section, SectionContent, SectionImage, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute } from "@tanstack/react-router";

import { ContactForm } from "@/routes/_public/contact/-form";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/contact/")({
  component: ContactPage,
  loader: () => readIndexPage(),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function ContactPage() {
  const { contact } = Route.useLoaderData();
  return (
    <Section id="contact" intent="primary" reverse>
      <SectionImage image={contact.image} />
      <SectionMain>
        <SectionTitle title={contact.title} />
        <SectionContent>{contact.content}</SectionContent>
        <ContactForm />
      </SectionMain>
    </Section>
  );
}
