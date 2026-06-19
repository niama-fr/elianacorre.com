import { readImageBySlug } from "./images";

export const allSets = [
  {
    content:
      "Cette collection est une ode à la beauté, née d'un désir : celui de rappeler aux êtres humains que le monde est beau. Cette beauté que le monde a enfouie et douloureusement cachée en nous, nous pouvons la refaire jaillir à tout moment, la retrouver et l'exprimer à notre tour. Rappelons-nous la sensation du soleil sur la peau, l'odeur de la pluie, la chaleur réconfortante d'une forêt, la poésie qui se cache derrière chacun de nos gestes, l'effet d'une chanson sur notre âme, la musique d'un poème.",
    imageSlug: "le-bruit-de-la-nuit",
    slug: "ode-a-la-beaute",
    title: "Ode à la beauté",
  },
  {
    content:
      "Dans cette collection, vous trouverez les animaux qui m'inspirent le plus, ceux qui résonnent avec mon âme. On retrouve ici un style plus graphique.",
    imageSlug: "bumblebee",
    slug: "bestiaire",
    title: "Bestiaire",
  },
  {
    content:
      "J'ai toujours eu pour les mains une étrange fascination. A travers ces oeuvres, je tente de capturer toute leur beauté et leur poésie.",
    imageSlug: "mains-i",
    slug: "la-poetique-des-mains",
    title: "La poétique des mains",
  },
  {
    content:
      "Le concept d'animal totem nous vient des peuples amérindiens et africains. Pour eux, chaque personne est reliée à l'esprit d'un animal qui nous guide, nous accompagne et nous protège. Son énergie vibre avec la nôtre et il est votre esprit gardien. Cette collection a vu le jour à la suite du contact thérapeutique des animaux sur mon être.",
    imageSlug: "je-te-vois",
    slug: "animal-totem",
    title: "Animal totem",
  },
] as const;

export const setFrom = ({ content, imageSlug, slug, title }: Sets["Entry"]) => ({
  content,
  image: readImageBySlug(imageSlug),
  slug,
  title,
});

export const readAllSets = () => allSets.map(setFrom);

export const readSetBySlug = (slug: Sets["Entry"]["slug"]) => {
  const entity = allSets.find((entry) => entry.slug === slug);
  if (!entity) throw new Error(`Set not found: ${slug}`);
  return setFrom(entity);
};

export const readAllSetsSlugs = () => allSets.map(({ slug }) => slug);

export type Sets = { Entity: ReturnType<typeof setFrom>; Entry: (typeof allSets)[number] };
