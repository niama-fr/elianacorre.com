import { readWorksSetPage } from "@ec/domain/helpers/pages";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Section, SectionMain } from "@ec/ui/components/section";
import { WorksGrid } from "@ec/ui/components/works-grid";
import { createFileRoute } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/oeuvres/$slug")({
  component: WorksSetPage,
  loader: ({ params: { slug } }) => readWorksSetPage(slug),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function WorksSetPage() {
  const works = Route.useLoaderData();

  return (
    <Section>
      <GridBackground />
      <SectionMain>
        <WorksGrid works={works} />
      </SectionMain>
    </Section>
  );
}
