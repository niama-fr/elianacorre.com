import { readRootLayout } from "@ec/domain/helpers/layouts";
import { GridBackground } from "@ec/ui/components/grid-background";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { Header } from "./-header";

import styleCss from "@/styles/public.css?url";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  head: () => ({
    links: [{ href: styleCss, rel: "stylesheet" }],
  }),
  loader: () => readRootLayout(),
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function PublicLayout() {
  const data = Route.useLoaderData();

  return (
    <>
      <GridBackground />
      <Header {...data} />
      <main className="relative mt-20 flex-1 sm:mt-28 md:mt-40">
        <Outlet />
      </main>
      <section className="relative flex justify-between bg-neutral-700 p-4 text-white">
        <span>© 2025 Eliana Corré</span>
        <Link to="/mentions-legales">Mentions légales</Link>
      </section>
    </>
  );
}
