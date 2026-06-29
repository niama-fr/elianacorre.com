import { readImageBySlug } from "@ec/domain/helpers/images";
import { readAllSets } from "@ec/domain/helpers/sets";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
type RootNav = {
  activeOptions?: {
    includeHash: boolean;
  };
  hash?: string;
  key: "carnets-de-voyage" | "contact" | "oeuvres" | "qui-suis-je";
  text: string;
  to: "/" | "/carnets-de-voyage" | "/oeuvres" | "/qui-suis-je";
};

const navs = [
  { hash: undefined, key: "carnets-de-voyage", text: "Carnets de voyage", to: "/carnets-de-voyage" },
  { hash: undefined, key: "qui-suis-je", text: "Qui suis-je?", to: "/qui-suis-je" },
  { hash: undefined, key: "oeuvres", text: "Œuvres", to: "/oeuvres" },
  { activeOptions: { includeHash: true }, hash: "contact", key: "contact", text: "Contact", to: "/" },
] as const satisfies readonly RootNav[];

export const readRootLayout = () => ({
  logoImg: readImageBySlug("logo"),
  navs,
  socials: [
    { href: "https://instagram.com/elianacorre", icon: "icon-[line-md--instagram]", key: "instagram", text: "Instagram" },
    // { key: "youtube", icon: "icon-[line-md--youtube-filled]", text: "Youtube", href: "https://youtube.com/@elianacorre" },
  ],
});
export type ReadRootLayoutProps = ReturnType<typeof readRootLayout>;

// WORKS -----------------------------------------------------------------------------------------------------------------------------------
export const readWorksLayout = () => ({
  hero: {
    content:
      "Vous retrouverez ici toutes les œuvres que j’ai réalisées. Si l’une d’entre elles résonne avec vous, n’hésitez pas à me contacter.",
    image: readImageBySlug("mes-oeuvres"),
    title: ["Découvrez", "mes œuvres"],
  },
  sets: readAllSets(),
});
