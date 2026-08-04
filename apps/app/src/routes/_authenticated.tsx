import { readImageBySlug } from "@ec/domain/helpers/images";
import { Button } from "@ec/ui/components/button";
import { ModeToggle } from "@ec/ui/components/mode-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@ec/ui/components/sidebar";
import { Toaster } from "@ec/ui/components/sonner";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { useState } from "react";
import { toast } from "sonner";

import { signOutAndReload } from "@/lib/auth/client";
import { AppSidebar } from "@/routes/_authenticated/-sidebar";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context: { token }, location: { href } }) => {
    if (token === undefined) redirect({ search: { redirect: href }, throw: true, to: "/connexion" });
  },
  component: AuthenticatedLayout,
  head: () => ({
    meta: [{ charSet: "utf-8" }, { content: "width=device-width, initial-scale=1", name: "viewport" }, { title: "TanStack Start Starter" }],
  }),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const ADMIN = {
  actions: cva("flex items-center gap-2"),
  header: cva("flex h-16 shrink-0 justify-between items-center gap-2"),
  inset: cva("p-4"),
  signout: cva("icon-[lucide--log-out]"),
};

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function AuthenticatedLayout() {
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
      <AppSidebar logoImg={readImageBySlug("logo")} />
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
