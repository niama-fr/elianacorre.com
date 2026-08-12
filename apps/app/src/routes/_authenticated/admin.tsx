import { readImageBySlug } from "@ec/domain/helpers/images";
import { hasAdminAccess } from "@ec/domain/helpers/profiles";
import { Button } from "@ec/ui/components/button";
import { ModeToggle } from "@ec/ui/components/mode-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@ec/ui/components/sidebar";
import { Toaster } from "@ec/ui/components/sonner";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { useState } from "react";
import { toast } from "sonner";

import { signOutAndReload } from "@/lib/auth/client";
import { getAuthenticatedLanding } from "@/lib/auth/redirects";
import { AdminSidebar } from "@/routes/_authenticated/admin/-sidebar";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context: { profile } }) => {
    if (!hasAdminAccess(profile)) redirect({ ...getAuthenticatedLanding(profile), replace: true, throw: true });
  },
  component: AdminLayout,
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const ADMIN = {
  actions: cva("flex items-center gap-2"),
  header: cva("flex h-16 shrink-0 items-center justify-between gap-2"),
  inset: cva("p-4"),
  signout: cva("icon-[lucide--log-out]"),
};

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function AdminLayout() {
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
    <SidebarProvider>
      <AdminSidebar logoImg={readImageBySlug("logo")} />
      <SidebarInset className={ADMIN.inset()}>
        <header className={ADMIN.header()}>
          <SidebarTrigger />
          <div className={ADMIN.actions()}>
            <Button
              aria-label="Se déconnecter"
              disabled={isSigningOut}
              size="icon"
              title="Se déconnecter"
              onClick={() => {
                void handleSignOut();
              }}
            >
              <span className={ADMIN.signout()} />
            </Button>
            <ModeToggle />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
