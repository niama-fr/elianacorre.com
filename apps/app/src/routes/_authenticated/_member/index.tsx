import { createFileRoute } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/_member/")({
  component: MemberHomePage,
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function MemberHomePage() {
  const { profile } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-foreground text-3xl font-extrabold">Espace membre</h1>
      <p className="text-muted-foreground text-sm">
        {profile.firstName === undefined ? "Bienvenue dans votre espace membre." : `Bienvenue, ${profile.firstName}.`}
      </p>
    </section>
  );
}
