import { linkOptions } from "@tanstack/solid-router";
import { readImageBySlug } from "./images";
import { readAllSets } from "./sets";

// ROOT ------------------------------------------------------------------------------------------------------------------------------------
const navs = linkOptions([
  { key: "qui-suis-je", text: "Qui suis-je?", to: "/qui-suis-je", hash: undefined },
  { key: "oeuvres", text: "Œuvres", to: "/oeuvres", hash: undefined },
  { key: "contact", text: "Contact", to: "/", hash: "contact", activeOptions: { includeHash: true } },
]);

export const readRootLayout = () => ({
  logoImg: readImageBySlug("logo"),
  navs,
  socials: [
    { key: "instagram", icon: "icon-[line-md--instagram]", text: "Instagram", href: "https://instagram.com/elianacorre" },
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
