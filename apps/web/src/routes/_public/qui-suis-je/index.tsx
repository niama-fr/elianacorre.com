import { readAboutPage } from "@ec/domain/helpers/pages";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import {
  Section,
  SectionContent,
  SectionImage,
  SectionMain,
  SectionTitle,
  type SectionProps,
  type SectionTitleProps,
} from "@ec/ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/qui-suis-je/")({
  component: RouteComponent,
  loader: () => readAboutPage(),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const PAGE = {
  aside: cva("flex basis-1/2 lg:translate-x-8"),
  heroContent: cva("text-base text-justify text-pretty sm:text-lg lg:text-justify"),
  main: cva("basis-1/2"),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function RouteComponent() {
  const { hero, items } = Route.useLoaderData();
  const sections: SectionProps[] = [{ intent: "secondary" }, { intent: "primary" }];
  const titles: Pick<SectionTitleProps, "intent">[] = [{ intent: "secondary" }, {}];

  return (
    <>
      <Hero image={hero?.img} title={hero?.title ?? []} className={{ aside: PAGE.aside(), main: PAGE.main() }}>
        <HeroContent className={PAGE.heroContent()}>
          {hero?.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </HeroContent>
      </Hero>
      {items.map(({ content, img, slug, title }, i) => (
        <Section
          key={slug}
          className={{ container: `lg:items-center ${i % 2 === 0 ? "lg:flex-row-reverse" : ""}` }}
          reverse={i % 2 === 0}
          {...sections[i]}
        >
          <SectionMain className={PAGE.main()}>
            <SectionTitle title={title} {...titles[i]} />
            <SectionContent>
              {content.map((paragraph, j) => (
                <p key={j}>{paragraph}</p>
              ))}
            </SectionContent>
          </SectionMain>
          <SectionImage className={{ figure: "flex basis-1/2" }} image={img} />
        </Section>
      ))}
    </>
  );
}
