import { readImageBySlug } from "@ec/domain/helpers/images";
import { allWorks, readLastWorks, workFrom } from "@ec/domain/helpers/works";

// ABOUT -----------------------------------------------------------------------------------------------------------------------------------
export const readAboutPage = () => ({
  hero: {
    content: [
      `Je grandis à l’île de la Réunion, en quête de sens et un peu désoeuvrée face à un monde que j'ai du mal à comprendre, je me réfugie 
      dans le dessin à 10 ans.`,
      `En grandissant, je m’égare sur d’autres voies, questionnant toujours la vie et cherchant un sens à cette drôle d’expérience. Je 
      délaisse quelque peu le dessin, occupée à grandir, à me chercher, mais je me sens toujours liée à l'art.`,
      `C’est en 2021 que je renoue définitivement avec les pinceaux, après des années à errer sur les sentiers du doute et les montagnes 
      de la peur. Je me jette à corps perdu dans l’art grâce au Milan Art Institute et décide de me faire confiance.`,
      `Je perfectionne mes techniques et trouve petit à petit ma voix, ma lumière. Je comprends alors qu’il est temps de me libérer des
			cases et des freins que je m'étais mis et de vivre totalement mon authenticité.`,
    ],
    img: readImageBySlug("qui-suis-je-decouvrez-mon-parcours"),
    slug: "decouvrez-mon-parcours",
    title: ["Découvre", "mon parcours"],
  },
  items: [
    {
      content: [
        `Je peins les énergies que je croise. Je m’inspire de mes rêves, de mon quotidien et de mes sensations. Parfois, une oeuvre
				émerge et le message n'apparaît qu’après. Mon processus de création est minutieux. J'aime combiner les médiums et chaque
				création est unique, à l’image de la nature humaine que je souhaite mettre en lumière. Aujourd'hui, j'ai accepté ma singularité
				et je chemine librement sur les routes de la Vie, en acceptant de me laisser surprendre à tout instant.`,
        `Je crois fermement en l’unicité de chaque être et à la nécessité de s’accepter pour pouvoir vivre sa propre aventure. Mon art
				aspire à rappeler aux autres la beauté qu’ils ont en eux, à l’aimer et à la chérir pour qu’ils retrouvent et expriment à leur
				tour leur vraie nature.`,
      ],
      img: readImageBySlug("qui-suis-je-mes-inspirations-sur-toile"),
      slug: "mes-inspirations-sur-toile",
      title: ["Inspirations", "sur toile"],
    },
    {
      content: [
        `En 2023, je quitte tout pour entamer un voyage qui me transformera à jamais. Je chemine pendant 9 mois en Asie du Sud-Est. Mon carnet
      à la main, je note toutes les émotions qui me traversent, je peins les paysages, l’architecture et tous les petits détails qui
      façonnent ce continent.`,
        `Je rentre chez moi, les yeux pleins d’étincelles et la tête pleine de souvenirs chers à mon cœur. Malheureusement, le retour est plus 
      difficile que je le pensais. Je suis complètement désorientée, je n’arrive plus à trouver ma place, je n’ai plus goût à rien et 
      j’expérimente une perte totale de sens.`,
        `C'est l'art qui me sauve. En reprenant les pinceaux, je redécouvre une façon d'habiter le monde : lentement, attentivement, les yeux 
      grands ouverts sur tout ce qui m’entoure. Le carnet de voyage devient alors mon compagnon de route. J’apprends à contempler ces petits 
      détails qui rendent la vie quotidienne plus belle. Aujourd'hui, j'ai envie de t'aider à faire de même. 
`,
      ],
      img: readImageBySlug("qui-suis-je-carnets-de-voyage"),
      slug: "carnets-de-voyage",
      title: ["Carnets", "de voyage"],
    },
  ],
});

// INDEX -----------------------------------------------------------------------------------------------------------------------------------
export const readIndexPage = () => ({
  contact: {
    content: "N’hésite pas à m’écrire pour tout complément d’information. Je répondrai dans les plus brefs délais.",
    image: readImageBySlug("contact"),
    title: ["Tu peux", "me contacter"],
  },
  hero: {
    button: "Me contacter",
    content: "Je t’aide à renouer avec la beauté du monde à travers la pratique libre et créative du carnet de voyage.",
    image: readImageBySlug("accueil"),
    title: ["Bienvenue!", "Je suis Eliana"],
  },
  quote: {
    author: "Wayne Dyer",
    sentence: `" Don’t die with your song still inside you"`,
  },
  works: {
    items: readLastWorks(3),
    title: ["Mes dernières ", "créations"],
  },
});

// WORKS SET -------------------------------------------------------------------------------------------------------------------------------
export const readWorksSetPage = (slug: string) => allWorks.map(workFrom).filter((work) => work.set.slug === slug);

// LEGALE NOTICE ---------------------------------------------------------------------------------------------------------------------------
export const readLegaleNoticePage = () => ({});
