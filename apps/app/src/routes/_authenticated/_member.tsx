import { hasMemberAccess } from "@ec/domain/helpers/profiles";
import { Button } from "@ec/ui/components/button";
import { ModeToggle } from "@ec/ui/components/mode-toggle";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { signOutAndReload } from "@/lib/auth/client";
import { getAuthenticatedLanding } from "@/lib/auth/redirects";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/_member")({
  beforeLoad: ({ context: { profile } }) => {
    if (!hasMemberAccess(profile)) redirect({ ...getAuthenticatedLanding(profile), replace: true, throw: true });
  },
  component: MemberLayout,
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function MemberLayout() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutAndReload();
    } catch {
      setIsSigningOut(false);
      toast.error("La déconnexion a échoué. Réessayez.");
    }
  };

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 p-4 md:p-8">
      <header className="flex items-center justify-between gap-4">
        <span className="font-semibold">Eliana Corré</span>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Se déconnecter"
            disabled={isSigningOut}
            size="icon"
            title="Se déconnecter"
            onClick={() => {
              void handleSignOut();
            }}
          >
            <span className="icon-[lucide--log-out]" />
          </Button>
          <ModeToggle />
        </div>
      </header>
      <Outlet />
    </main>
  );
}
