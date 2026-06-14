import { readWorksSetPage } from "@ec/domain/pages";
import { GridBackground } from "@ec/ui2/grid-background";
import { Section, SectionMain } from "@ec/ui2/section";
import { WorksGrid } from "@ec/ui2/works-grid";
import { createFileRoute } from "@tanstack/solid-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/oeuvres/$slug")({
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
        <WorksGrid works={works()} />
      </SectionMain>
    </Section>
  );
}
