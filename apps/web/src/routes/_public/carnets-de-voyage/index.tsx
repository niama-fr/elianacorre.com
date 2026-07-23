import { readImageBySlug } from "@ec/domain/helpers/images";
import { Btn } from "@ec/ui/components/btn";
import { Card, CardContent, CardHeader, CardTitle } from "@ec/ui/components/card";
import { Hero, HeroContent } from "@ec/ui/components/hero";
import { Section, SectionContent, SectionImage, SectionMain, SectionTitle } from "@ec/ui/components/section";
import { cn } from "@ec/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import { createSeoHead } from "@/lib/seo";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/carnets-de-voyage/")({
  component: TravelDiariesPage,
  head: () =>
    createSeoHead({
      description:
        "Découvre l’art du carnet de voyage avec Eliana Corré et reçois un e-book pour observer, dessiner et raconter ton quotidien.",
      image: "https://ik.imagekit.io/elianacorre/carnets-de-voyage/hero.jpg",
      path: "/carnets-de-voyage",
      title: "Carnets de voyage — Eliana Corré",
    }),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const PAGE = {
  badge: cva("text-white px-2 font-medium bg-secondary rounded-2xl"),
  card: cva("bg-secondary/20 ring-0"),
  cardItem: cva("flex gap-3 items-center text-lg"),
  cardItemIcon: cva("icon-[tabler--star-filled] text-secondary flex-none size-7"),
  cardItems: cva("flex flex-col gap-6"),
  cardTitle: cva("text-xl uppercase font-extrabold items-center flex gap-2"),
  cardTitleIcon: cva("size-8"),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function TravelDiariesPage() {
  const ebookItems = [
    "T’équiper avec ton premier matériel",
    "Créer des outils qui faciliteront ta pratique",
    "Trouver l’inspiration au quotidien",
  ];

  const newsletterItems = [
    "Une page de mon carnet pour t’inspirer",
    "Un exercice créatif pour te lancer en toute autonomie",
    "Mes inspirations et coups de coeur du mois",
    "Une histoire personnelle",
    "Mes actus",
  ];

  return (
    <>
      <Hero image={readImageBySlug("carnets-de-voyage")} title={["Le carnet", "de voyage"]}>
        <HeroContent>
          <p>
            J&apos;ai longtemps cru que pour faire un carnet de voyage, il fallait partir loin et vivre quelque chose d&apos;exceptionnel
            avant d&apos;avoir le droit de dessiner. Mais ce n&apos;est pas le voyage qui fait le carnet, c&apos;est le regard. Ton
            quartier, la vue que tu as de ta maison, ta promenade du matin, ton repas : ton quotidien est bien souvent la destination de
            quelqu’un d’autre.
          </p>
          <p>
            La pratique du carnet de voyage t’invite à redécouvrir ton environnement avec un regard nouveau, à ralentir, à contempler la vie
            pleinement. C’est un voyage extérieur qui t’invite à coucher sur papier tout ce qui se passe à l’intérieur. C’est pourquoi, tu
            n’as pas besoin de savoir dessiner, ni de voyager pour en créer un.
          </p>
        </HeroContent>
        <Btn
          icon="icon-[tabler--square-rounded-arrow-down-filled] animate-bounce"
          kind="link"
          hash="la-gazette-itinerante"
          to="/carnets-de-voyage"
          className={{ base: "text-lg self-center" }}
        >
          Rejoins-moi
        </Btn>
      </Hero>
      <Section intent="secondary">
        <SectionMain>
          <SectionTitle title={["Commence", "dès aujourd'hui"]} intent="secondary" />
          <SectionContent className="w-full">
            <p>
              Si toi aussi tu veux observer la beauté du monde, n’attends plus et rejoins ma newsletter{" "}
              <Link hash="la-gazette-itinerante" to="/carnets-de-voyage" className={PAGE.badge()}>
                La gazette itinérante
              </Link>
            </p>
            <TravelDiariesCard icon="icon-[tabler--news]" intent="secondary" items={newsletterItems} title="Chaque mois, je t'envoie :" />
            <Btn
              intent="secondary"
              icon="icon-[tabler--square-rounded-arrow-down-filled] animate-bounce"
              kind="link"
              hash="la-gazette-itinerante"
              to="/carnets-de-voyage"
              className={{ base: "self-center" }}
            >
              C&apos;est par ici !
            </Btn>
          </SectionContent>
        </SectionMain>
      </Section>
      <Section intent="primary" reverse>
        <SectionImage image={readImageBySlug("e-book")} />
        <SectionMain>
          <SectionTitle title={["Et reçois", "mon e-book"]} />
          <SectionContent>
            <p>
              Dans cet e-book, je t&apos;accompagne pour faire tes premiers pas dans l’art du carnet de voyage. Tu n’as pas besoin
              d&apos;être une artiste, ni de voyager.
            </p>
            <TravelDiariesCard icon="icon-[tabler--book]" items={ebookItems} title="Cet e-book va t’aider à :" />
          </SectionContent>
        </SectionMain>
      </Section>
    </>
  );
}

// CARD ------------------------------------------------------------------------------------------------------------------------------------
const CARD = {
  base: cva("group/card data-[intent=secondary]:bg-secondary/20 data-[intent=primary]:bg-primary/20 ring-0"),
  content: cva(`px-4
  sm:px-6`),
  header: cva(`px-4
  sm:px-6`),
  item: cva(`flex gap-3 items-center
  sm:text-lg
  2xl:text-xl`),
  itemIcon: cva(`icon-[tabler--star-filled] flex-none size-5
  group-data-[intent=primary]/card:text-primary
  group-data-[intent=secondary]/card:text-secondary
  sm:size-7`),
  items: cva("flex flex-col gap-6"),
  title: cva(`uppercase font-extrabold items-center flex gap-2 text-start
  sm:text-xl
  2xl:text-2xl`),
  titleIcon: cva(`size-7
  sm:size-8
  2xl:size-9`),
};

function TravelDiariesCard({ icon, intent = "primary", items, title }: TravelDiariesCardProps) {
  return (
    <Card className={CARD.base()} data-intent={intent}>
      <CardHeader className={CARD.header()}>
        <CardTitle className={CARD.title()}>
          <span className={cn(CARD.titleIcon(), icon)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={CARD.content()}>
        <ul className={CARD.items()}>
          {items.map((item) => (
            <li key={item} className={CARD.item()}>
              <span className={CARD.itemIcon()} />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
type TravelDiariesCardProps = { icon: string; intent?: "primary" | "secondary"; items: string[]; title: string };
