import { readImageBySlug } from "./images";
import { allWorks, readLastWorks, workFrom } from "./works";

// ABOUT -----------------------------------------------------------------------------------------------------------------------------------
export const readAboutPage = () => [
  {
    img: readImageBySlug("decouvrez-mon-parcours"),
    slug: "decouvrez-mon-parcours",
    title: ["Découvrez", "mon parcours"],
    content: `Je grandis à l’île de la Réunion, en quête de sens et un peu désoeuvrée face à un monde que j'ai du mal à comprendre, je me
						réfugie dans le dessin à 10 ans. En grandissant, je m’égare sur d’autres voies, questionnant toujours la vie et cherchant un
						sens à cette drôle d’expérience. Je délaisse quelque peu le dessin, occupée à grandir, à me chercher, mais je me sens toujours
						liée à l'art. C’est en 2021 que je renoue définitivement avec les pinceaux, après des années à errer sur les sentiers du doute
						et les montagnes de la peur. Je me jette à corps perdu dans l’art grâce au Milan Art Institute et décide de me faire confiance.
						Je perfectionne mes techniques et trouve petit à petit ma voix, ma lumière. Je comprends alors qu’il est temps de me libérer des
						cases et des freins que je m'étais mis et de vivre totalement mon authenticité.`,
  },
  {
    img: readImageBySlug("mes-inspirations-et-mes-techniques"),
    slug: "mes-inspirations-et-mes-techniques",
    title: ["Mes inspirations", "et techniques"],
    content: `Je peins les énergies que je croise. Je m’inspire de mes rêves, de mon quotidien et de mes sensations. Parfois, une oeuvre
						émerge et le message n'apparaît qu’après. Mon processus de création est minutieux. J'aime combiner les médiums et chaque
						création est unique, à l’image de la nature humaine que je souhaite mettre en lumière. Aujourd'hui, j'ai accepté ma singularité
						et je chemine librement sur les routes de la Vie, en acceptant de me laisser surprendre à tout instant.`,
  },
  {
    img: readImageBySlug("mon-message-au-monde"),
    slug: "mon-message-au-monde",
    title: ["Mon message", "au monde"],
    content: `Je crois fermement en l’unicité de chaque être et à la nécessité de s’accepter pour pouvoir vivre sa propre aventure. Mon art
						aspire à rappeler aux autres la beauté qu’ils ont en eux, à l’aimer et à la chérir pour qu’ils retrouvent et expriment à leur
						tour leur vraie nature.`,
  },
];

// INDEX -----------------------------------------------------------------------------------------------------------------------------------
export const readIndexPage = () => ({
  contact: {
    content: "N’hésitez pas à m’écrire pour tout complément d’information. Je répondrai dans les plus brefs délais.",
    image: readImageBySlug("contact"),
    title: ["Vous souhaitez", "me contacter ?"],
  },
  hero: {
    button: "Me contacter",
    content: "Je vous aide à retrouver le calme intérieur et à exprimer votre créativité sans jugement à travers l’art et le yoga.",
    image: readImageBySlug("accueil"),
    title: ["Bienvenue!", "Je suis Eliana"],
  },
  quote: {
    author: "Wayne Dyer",
    sentence: `" Don’t die with your song still inside you"`,
  },
  works: {
    // biome-ignore lint/style/noMagicNumbers: off
    items: readLastWorks(3),
    title: ["Mes dernières ", "créations"],
  },
});

// WORKS SET -------------------------------------------------------------------------------------------------------------------------------
export const readWorksSetPage = (slug: string) => allWorks.map(workFrom).filter((work) => work.set.slug === slug);

// LEGALE NOTICE ---------------------------------------------------------------------------------------------------------------------------
export const readLegaleNoticePage = () => ({});
