import { readAboutPage } from "@ec/domain/pages";
import { Section, SectionContent, SectionImage, SectionMain, SectionTitle } from "@ec/ui/section";
import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/qui-suis-je")({
  component: RouteComponent,
  loader: () => readAboutPage(),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function RouteComponent() {
  const data = Route.useLoaderData();
  const intents = ["default", "secondary", "primary"] as const;

  return (
    <For each={data()}>
      {({ content, img, title }, i) => (
        <Section class={{ container: i() % 2 === 0 ? "" : "lg:flex-row-reverse" }} intent={intents[i()]} reverse={i() % 2 !== 0}>
          <SectionMain class="basis-1/2">
            <SectionTitle title={title} />
            <SectionContent>{content}</SectionContent>
          </SectionMain>
          <SectionImage class={{ figure: "flex basis-1/2" }} image={img} />
        </Section>
      )}
    </For>
  );
}
