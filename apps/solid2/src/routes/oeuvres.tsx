import { readWorksLayout } from "@ec/domain/layouts";
import type { Sets } from "@ec/domain/sets";
import { BtnLink } from "@ec/ui2/btn";
import { Hero, HeroContent } from "@ec/ui2/hero";
import { Section, SectionContent, SectionMain, SectionTitle } from "@ec/ui2/section";
import { Image } from "@ec/unpic-solid2";
import { createFileRoute, Outlet, useParams } from "@tanstack/solid-router";
import { cva } from "class-variance-authority";
import { createMemo, For } from "solid-js";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/oeuvres")({
  component: WorksLayout,
  loader: () => readWorksLayout(),
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function WorksLayout() {
  const data = Route.useLoaderData();

  return (
    <>
      <Hero image={data().hero.image} title={data().hero.title}>
        <HeroContent>{data().hero.content}</HeroContent>
      </Hero>
      <WorksLayoutSets sets={data().sets} />
      <Outlet />
    </>
  );
}

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const WORKS = {
  base: cva(
    `min-h-[470px]
    lg:min-h-[500px] lg:items-stretch lg:gap-20
    xl:min-h-auto`
  ),
  aside: cva(
    `relative hidden flex-none aspect-square self-center
    lg:flex lg:w-xs
    xl:w-sm 
    2xl:w-md`
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
export function WorksLayoutSets(_: WorksLayoutSetsProps) {
  const params = useParams({ from: "/oeuvres/$slug" });
  const count = createMemo(() => _.sets.length);
  const activeIndex = createMemo(() => _.sets.findIndex((set) => set.slug === params().slug));
  const activeSet = createMemo(() => _.sets[activeIndex()]);

  const nextLink = createMemo(
    () =>
      ({
        to: "/oeuvres/$slug",
        params: { slug: _.sets[(activeIndex() + 1) % count()]?.slug },
        resetScroll: false,
      }) as const
  );
  const previousLink = createMemo(
    () =>
      ({
        to: "/oeuvres/$slug",
        params: { slug: _.sets[(activeIndex() + count() - 1) % count()]?.slug },
        resetScroll: false,
      }) as const
  );

  return (
    <Section class={{ container: WORKS.base() }} intent="secondary">
      <aside class={WORKS.aside()}>
        <For each={_.sets}>
          {(set, i) => {
            const { height: _, ...r } = set.image;
            return (
              <figure
                class={WORKS.figure({ active: i() === activeIndex() })}
                style={{ rotate: `${((i() - activeIndex()) * 45) / count()}deg` }}
              >
                <Image
                  {...r}
                  aspectRatio={1}
                  class={WORKS.image()}
                  operations={{ imagekit: { f: "avif" } }}
                  sizes="(min-width: 1536px) 448px, (min-width: 1280px) 384px, (min-width: 1024px) 320px, 1px"
                />
              </figure>
            );
          }}
        </For>
      </aside>
      <SectionMain class={WORKS.main()}>
        <div class={WORKS.description()}>
          <SectionTitle class={{ titleRow: WORKS.title() }} title={["Collection", activeSet().title]} />
          <SectionContent>{activeSet().content}</SectionContent>
        </div>
        <div class={WORKS.nav()}>
          <BtnLink {...previousLink()} icon="icon-lucide--chevron-left" intent="secondary" reverse>
            Précédente
          </BtnLink>
          <BtnLink {...nextLink()} intent="secondary">
            Suivante
          </BtnLink>
        </div>
      </SectionMain>
    </Section>
  );
}
export type WorksLayoutSetsProps = { sets: Sets["Entity"][] };
