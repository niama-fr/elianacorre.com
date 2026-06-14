import { readRootLayout } from "@ec/domain/layouts";
import { GridBackground } from "@ec/ui2/grid-background";
import { NoHydration } from "@solidjs/web";
import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/solid-router";
import { createSignal, type Element, Loading, onSettled } from "solid-js";
import styleCss from "@/styles.css?url";
import { Header } from "./-header";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Eliana Corré" },
      {
        name: "description",
        content: "Artiste peintre à l'île de la Réunion vous présente l'ensemble de ses collections.",
      },
      {
        name: "keywords",
        content:
          "artiste peintre, Eliana Corré, tableaux personnalisés, animaux totems, art contemporain, peinture nature, œuvres sur mesure, art réconfortant, peinture animale, portfolio artiste",
      },
      { name: "author", content: "Eliana Corré" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "stylesheet", href: styleCss }],
  }),
  loader: () => readRootLayout(),
  shellComponent: RootDocument,
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function RootDocument(props: { children: Element }) {
  const data = Route.useLoaderData();
  const [isScrolled, setIsScrolled] = createSignal(false);

  onSettled(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 1);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  });

  return (
    <html lang="fr">
      <head>
        <NoHydration>
          <HeadContent />
        </NoHydration>
      </head>
      <body class="group/body" data-scrolled={isScrolled()}>
        <GridBackground />
        <Header data={data} />
        <main class="relative mt-20 flex-1 sm:mt-28 md:mt-40">
          <Loading>{props.children}</Loading>
        </main>
        <section class="relative flex justify-between bg-neutral-700 p-4 text-white">
          <span>© 2025 Eliana Corré</span>
          <Link to="/mentions-legales">Mentions légales</Link>
        </section>
        <Scripts />
      </body>
    </html>
  );
}
