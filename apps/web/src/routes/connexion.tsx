import { Button } from "@ec/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth/client";
import { createNoindexHead } from "@/lib/seo";

import styleCss from "@/styles/admin.css?url";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/connexion")({
  component: SignInPage,
  head: () => ({
    links: [{ href: styleCss, rel: "stylesheet" }],
    ...createNoindexHead("Connexion — Eliana Corré"),
  }),
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/admin",
  }),
});

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function SignInPage() {
  const search = Route.useSearch();

  const signIn = async () => {
    await authClient.signIn.social({ callbackURL: search.redirect, provider: "google" });
  };

  return (
    <div className="flex items-center justify-center min-h-svh">
      <Button onClick={() => void signIn()}>Connexion</Button>
    </div>
  );
}
