import { readWorksSetPage } from "@ec/domain/helpers/pages";
import { readAllSets } from "@ec/domain/helpers/sets";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Section, SectionMain } from "@ec/ui/components/section";
import { WorksGrid } from "@ec/ui/components/works-grid";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { createSeoHead } from "@/lib/seo";

type CollectionPage = { set: ReturnType<typeof readAllSets>[number]; works: ReturnType<typeof readWorksSetPage> };

export const readCollection = (slug: string): CollectionPage => {
  const set = readAllSets().find((candidate) => candidate.slug === slug);
  if (set) return { set, works: readWorksSetPage(slug) };
  notFound({ throw: true });
  throw new Error("Unreachable after notFound");
};

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
// oxfmt-ignore -- TanStack's loaderData inference requires loader to precede head under TypeScript 7.
// oxlint-disable-next-line sort-keys -- Keep loader before head for TanStack's TypeScript 7 inference.
export const Route = createFileRoute("/_public/oeuvres/$slug")({
  component: WorksSetPage,
  loader: ({ params: { slug } }) => readCollection(slug),
  head: ({ params: { slug } }) => {
    const set = readAllSets().find((candidate) => candidate.slug === slug);
    return set
      ? createSeoHead({
          description: set.content,
          image: set.image.src,
          path: `/oeuvres/${set.slug}`,
          title: `${set.title} — Œuvres d’Eliana Corré`,
        })
      : {};
  },
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function WorksSetPage() {
  const { works } = Route.useLoaderData();

  return (
    <Section>
      <GridBackground />
      <SectionMain>
        <WorksGrid works={works} />
      </SectionMain>
    </Section>
  );
}
