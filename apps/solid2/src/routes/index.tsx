import { readIndexPage } from "@ec/domain/pages";
import { BTN, BtnContent } from "@ec/ui2/btn";
import { GridBackground } from "@ec/ui2/grid-background";
import { Hero, HeroContent } from "@ec/ui2/hero";
import { Section, SectionContent, SectionImage, SectionMain, SectionTitle } from "@ec/ui2/section";
import { WorksGrid } from "@ec/ui2/works-grid";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/")({
  component: IndexPage,
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
  const data = Route.useLoaderData();

  return (
    <>
      <Hero class={{ aside: "flex" }} image={data().hero.image} title={data().hero.title}>
        <HeroContent>{data().hero.content}</HeroContent>
        <Link class={BTN.base()} hash="contact" to="/">
          <BtnContent>{data().hero.button}</BtnContent>
        </Link>
      </Hero>
      <Section class={{ base: "lg:-mt-20" }} intent="secondary">
        <SectionMain>
          <SectionTitle title={data().works.title} />
          <WorksGrid works={data().works.items} />
        </SectionMain>
      </Section>
      <section class={QUOTE.base()}>
        <GridBackground />
        <div class={QUOTE.content()}>
          <h3 class={QUOTE.sentence()}>{data().quote.sentence}</h3>
          <h4 class={QUOTE.author()}>{data().quote.author}</h4>
        </div>
      </section>
      <Section id="contact" intent="primary" reverse>
        <SectionImage image={data().contact.image} />
        <SectionMain>
          <SectionTitle title={data().contact.title} />
          <SectionContent>{data().contact.content}</SectionContent>
          {/* <IndexForm />  */}
        </SectionMain>
      </Section>
      {/* <Toaster position="bottom-center" /> */}
    </>
  );
}
