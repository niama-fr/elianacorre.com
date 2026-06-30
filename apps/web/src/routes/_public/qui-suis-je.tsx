import { readAboutPage } from "@ec/domain/helpers/pages";
import { Section, SectionContent, SectionImage, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/qui-suis-je")({
  component: RouteComponent,
  loader: () => readAboutPage(),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function RouteComponent() {
  const data = Route.useLoaderData();
  const intents = ["default", "secondary", "primary"] as const;

  return (
    <>
      {data.map(({ content, img, slug, title }, i) => (
        <Section
          key={slug}
          className={{ container: `lg:items-center ${i % 2 === 0 ? "" : "lg:flex-row-reverse"}` }}
          intent={intents[i]}
          reverse={i % 2 !== 0}
        >
          <SectionMain className="basis-1/2">
            <SectionTitle title={title} />
            <SectionContent>{content}</SectionContent>
          </SectionMain>
          <SectionImage className={{ figure: "flex basis-1/2" }} image={img} />
        </Section>
      ))}
    </>
  );
}
