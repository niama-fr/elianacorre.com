import { Alert, AlertDescription, AlertTitle } from "@ec/ui/components/alert";
import { Button } from "@ec/ui/components/button";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { signOutAndReload } from "@/lib/auth/client";
import { getAuthenticatedLanding } from "@/lib/auth/redirects";

export const Route = createFileRoute("/_authenticated/acces-refuse")({
  beforeLoad: ({ context: { profile } }) => {
    if (profile.role !== "contact") redirect({ ...getAuthenticatedLanding(profile), replace: true, throw: true });
  },
  component: AccessDeniedPage,
});

function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl items-center p-4">
      <Alert>
        <AlertTitle>Accès indisponible</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-4">
          Ce compte ne dispose pas d’un accès membre ou administrateur.
          <Button
            type="button"
            onClick={() => {
              void signOutAndReload();
            }}
          >
            Se déconnecter
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
