import { readWorksLayout } from "@ec/domain/helpers/layouts";
import type { Sets } from "@ec/domain/helpers/sets";
import { Btn } from "@ec/ui/components/btn";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import { Image } from "@ec/ui/components/image";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { useMemo } from "react";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/oeuvres")({
  component: WorksLayout,
  loader: () => readWorksLayout(),
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function WorksLayout() {
  const { hero, sets } = Route.useLoaderData();

  return (
    <>
      <Hero {...hero}>
        <HeroContent>{hero.content}</HeroContent>
      </Hero>
      <WorksLayoutSets sets={sets} />
      <Outlet />
    </>
  );
}

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const WORKS = {
  aside: cva(
    `relative hidden flex-none aspect-square self-center
    lg:flex lg:w-xs
    xl:w-sm 
    2xl:w-md`
  ),
  base: cva(
    `min-h-117.5
    lg:min-h-125 lg:items-stretch lg:gap-20
    xl:min-h-auto`
  ),
  description: cva(
    `flex flex-1 flex-col justify-center gap-8 transition
    starting:translate-x-10 starting:opacity-0`
  ),
  figure: cva("absolute size-full overflow-hidden rounded-3xl bg-neutral-200 shadow-2xl transition", {
    variants: {
      active: {
        false: "-translate-z-96 z-10 scale-90 opacity-80",
        true: "translate-z-0 z-40 scale-100 opacity-100",
      },
    },
  }),
  image: cva("size-full object-cover"),
  main: cva("flex-1 justify-between"),
  nav: cva("flex w-full justify-between"),
  title: cva(
    `text-2xl 
    sm:text-4xl 
    2xl:text-5xl`
  ),
};

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
export function WorksLayoutSets(props: WorksLayoutSetsProps) {
  const { sets } = props;
  const { slug } = useParams({ from: "/_public/oeuvres/$slug" });
  const count = useMemo(() => sets.length, [sets]);
  const activeIndex = useMemo(() => sets.findIndex((set) => set.slug === slug), [sets, slug]);
  const activeSet = useMemo(() => sets[activeIndex], [activeIndex, sets]);

  const nextLink = useMemo(
    () =>
      ({
        params: { slug: sets[(activeIndex + 1) % count]?.slug },
        resetScroll: false,
        to: "/oeuvres/$slug",
      }) as const,
    [activeIndex, count, sets]
  );
  const previousLink = useMemo(
    () =>
      ({
        params: { slug: sets[(activeIndex + count - 1) % count]?.slug },
        resetScroll: false,
        to: "/oeuvres/$slug",
      }) as const,
    [activeIndex, count, sets]
  );

  return (
    <Section className={{ container: WORKS.base() }} intent="secondary">
      <aside className={WORKS.aside()}>
        {sets.map((set, i) => {
          const { height: _h, ...r } = set.image;
          return (
            <figure
              key={set.slug}
              className={WORKS.figure({ active: i === activeIndex })}
              style={{ rotate: `${((i - activeIndex) * 45) / count}deg` }}
            >
              <Image
                {...r}
                aspectRatio={1}
                className={WORKS.image()}
                operations={{ imagekit: { f: "avif" } }}
                sizes="(min-width: 1536px) 448px, (min-width: 1280px) 384px, (min-width: 1024px) 320px, 1px"
              />
            </figure>
          );
        })}
      </aside>
      <SectionMain className={WORKS.main()}>
        <div className={WORKS.description()}>
          <SectionTitle className={{ titleRow: WORKS.title() }} title={["Collection", activeSet.title]} />
          <SectionContent>{activeSet.content}</SectionContent>
        </div>
        <div className={WORKS.nav()}>
          <Btn kind="link" {...previousLink} icon="icon-lucide--chevron-left" intent="secondary" reverse>
            Précédente
          </Btn>
          <Btn kind="link" {...nextLink} intent="secondary">
            Suivante
          </Btn>
        </div>
      </SectionMain>
    </Section>
  );
}
export type WorksLayoutSetsProps = { sets: Sets["Entity"][] };
