import { Button } from "@ec/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth/client";
import { getSafeAuthRedirect } from "@/lib/auth/redirects";
import { createNoindexHead } from "@/lib/seo";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/connexion")({
  component: SignInPage,
  head: () => createNoindexHead("Connexion — Eliana Corré"),
  validateSearch: (search) => ({
    redirect: getSafeAuthRedirect(search.redirect),
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
