import { Button } from "@ec/ui/components/button";
import { FieldGroup } from "@ec/ui/components/field";
import { useSearch } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/infra/auth/client";
import * as m from "@/paraglide/messages";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const FORM = {
  base: cva("flex w-full max-w-sm flex-col gap-4"),
  heading: cva("flex flex-col items-center gap-1 text-center"),
};

type SocialProvider = "facebook" | "google" | "twitter";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export function SigninForm() {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const search = useSearch({ from: "/connexion/" });

  const signIn = async (provider: SocialProvider) => {
    setPendingProvider(provider);
    try {
      const { error } = await authClient.signIn.social({ callbackURL: search.redirect, provider });
      if (error) throw new Error(`${provider} sign-in failed`);
    } catch {
      setPendingProvider(null);
      toast.error("La connexion a échoué. Réessayez.");
    }
  };

  return (
    <div className={FORM.base()}>
      <FieldGroup>
        <div className={FORM.heading()}>
          <h1 className="text-2xl font-bold">{m.giant_drab_baboon_fond()}</h1>
          <p className="text-muted-foreground text-sm text-balance">{m.just_lucky_leopard_fetch()}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            disabled={pendingProvider !== null}
            onClick={() => {
              void signIn("google");
            }}
            type="button"
          >
            <svg aria-hidden xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            {pendingProvider === "google" ? "Connexion…" : "Continuer avec Google"}
          </Button>
          <Button
            disabled={pendingProvider !== null}
            onClick={() => {
              void signIn("facebook");
            }}
            type="button"
            variant="outline"
          >
            <span aria-hidden className="icon-[tabler--brand-facebook]" />
            {pendingProvider === "facebook" ? "Connexion…" : "Continuer avec Facebook"}
          </Button>
          <Button
            disabled={pendingProvider !== null}
            onClick={() => {
              void signIn("twitter");
            }}
            type="button"
            variant="outline"
          >
            <span aria-hidden className="icon-[tabler--brand-x]" />
            {pendingProvider === "twitter" ? "Connexion…" : "Continuer avec X"}
          </Button>
        </div>
      </FieldGroup>
    </div>
  );
}
