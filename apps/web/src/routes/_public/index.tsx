import { readIndexPage } from "@ec/domain/helpers/pages";
import { Btn } from "@ec/ui/components/btn";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { WorksGrid } from "@ec/ui/components/works-grid";
import { createFileRoute } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import { createSeoHead } from "@/lib/seo";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/")({
  component: IndexPage,
  head: () =>
    createSeoHead({
      description: "Découvre les œuvres et carnets de voyage d’Eliana Corré, artiste peintre à La Réunion.",
      path: "/",
      title: "Eliana Corré — Artiste peintre à La Réunion",
    }),
  loader: () => readIndexPage(),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const QUOTE = {
  author: cva(`text-lg font-black text-neutral-500
    sm:text-xl
    md:text-2xl
    2xl:text-3xl`),
  base: cva(`relative px-4 py-8
    sm:px-8
    md:py-20`),
  content: cva(`relative flex flex-col items-center gap-4
    sm:gap-8`),
  sentence: cva(`font-heading font-bold text-3xl text-center
    sm:text-5xl
    md:text-6xl
    2xl:text-7xl`),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function IndexPage() {
  const { hero, quote, works } = Route.useLoaderData();

  return (
    <>
      <Hero className={{ aside: "flex" }} image={hero.image} title={hero.title}>
        <HeroContent>{hero.content}</HeroContent>
        <Btn kind="link" to="/contact" className={{ base: "text-base sm:text-lg xl:text-xl" }}>
          {hero.button}
        </Btn>
      </Hero>
      <Section className={{ base: "lg:-mt-20" }} intent="secondary">
        <SectionMain>
          <SectionTitle title={["Le carnet", "de voyage"]} intent="secondary" />
          <SectionContent>
            <p className="text-justify text-pretty">
              L&apos;art du carnet de voyage, ce n&apos;est pas juste représenter ce qu&apos;on a sous les yeux. C&apos;est une pratique
              dans laquelle tu couches sur papier ce qui attire ton regard, ce que tu ressens, ce que tu ne veux pas oublier. Moi,
              c&apos;est ce qui me fait revenir au carnet encore et encore, cette façon de ralentir, de vraiment voir ce qui m&apos;entoure,
              de garder une trace vivante du monde tel que je le traverse.
            </p>
            <p className="text-justify text-pretty">
              Et la bonne nouvelle, c&apos;est que tu n&apos;as pas besoin de savoir dessiner, ni de voyager pour en créer un. Le carnet de
              voyage s&apos;invite dans le quotidien, dans les petits moments autant que dans les grands départs.
            </p>
            <p className="text-justify text-pretty">
              Si l&apos;idée te tente mais que tu ne sais pas par où commencer, j&apos;ai créé un guide gratuit pour t&apos;accompagner dans
              tes premiers pas.
            </p>
            <Btn kind="link" intent="secondary" to="/carnets-de-voyage" className={{ base: "self-center lg:self-end" }}>
              En savoir plus
            </Btn>
          </SectionContent>
        </SectionMain>
      </Section>
      <Section intent="primary">
        <SectionMain>
          <SectionTitle title={works.title} />
          <WorksGrid works={works.items} />
        </SectionMain>
      </Section>
      <section className={QUOTE.base()}>
        <GridBackground />
        <div className={QUOTE.content()}>
          <h3 className={QUOTE.sentence()}>{quote.sentence}</h3>
          <h4 className={QUOTE.author()}>{quote.author}</h4>
        </div>
      </section>
    </>
  );
}
