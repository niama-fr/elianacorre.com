import { Button } from "@ec/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

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
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = async () => {
    setIsSigningIn(true);
    try {
      const { error } = await authClient.signIn.social({ callbackURL: search.redirect, provider: "google" });
      if (error) throw new Error("Google sign-in failed");
    } catch {
      setIsSigningIn(false);
      toast.error("La connexion a échoué. Réessayez.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-svh">
      <Button disabled={isSigningIn} onClick={() => void signIn()}>
        {isSigningIn ? "Connexion…" : "Connexion"}
      </Button>
    </div>
  );
}
