import { readRootLayout } from "@ec/domain/layouts";
import { GridBackground } from "@ec/ui/grid-background";
import { createRootRouteWithContext, HeadContent, Link, Outlet, Scripts } from "@tanstack/solid-router";
import { createSignal, onCleanup, onMount, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import styleCss from "../styles.css?url";
import { Header } from "./-header";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createRootRouteWithContext()({
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
  shellComponent: RootComponent,
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function RootComponent() {
  const data = Route.useLoaderData();
  const [isScrolled, setIsScrolled] = createSignal(false);

  onMount(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 1);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", handleScroll));
  });

  return (
    <html lang="fr">
      <head>
        <HydrationScript />
        <HeadContent />
      </head>
      <body class="group/body" data-scrolled={isScrolled()}>
        <GridBackground />
        <Header data={data} />
        <main class="relative mt-20 flex-1 sm:mt-28 md:mt-40">
          <Suspense>
            <Outlet />
          </Suspense>
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
