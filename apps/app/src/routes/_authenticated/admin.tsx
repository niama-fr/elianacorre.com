import { readImageBySlug } from "@ec/domain/helpers/images";
import { hasAdminAccess } from "@ec/domain/helpers/profiles";
import { SidebarInset, SidebarProvider } from "@ec/ui/components/sidebar";
import { Toaster } from "@ec/ui/components/sonner";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { useState } from "react";
import { toast } from "sonner";

import { signOutAndReload } from "@/infra/auth/client";
import { getAuthenticatedLanding } from "@/infra/auth/redirects";
import * as m from "@/paraglide/messages";
import { AdminHeader } from "@/routes/_authenticated/admin/-header";
import { AdminSidebar } from "@/routes/_authenticated/admin/-sidebar";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context: { profile } }) => {
    if (!hasAdminAccess(profile)) redirect({ ...getAuthenticatedLanding(profile), replace: true, throw: true });
  },
  component: AdminLayout,
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const LAYOUT = {
  content: cva("min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4"),
  root: cva("h-svh min-h-0 overflow-hidden"),
  shell: cva("min-h-0 overflow-hidden"),
};

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function AdminLayout() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutAndReload();
    } catch {
      setIsSigningOut(false);
      toast.error(m.metal_brooms_shop());
    }
  };

  return (
    <SidebarProvider className={LAYOUT.root()}>
      <AdminSidebar logoImg={readImageBySlug("logo")} />
      <SidebarInset className={LAYOUT.shell()} data-slot="admin-shell">
        <AdminHeader
          isSigningOut={isSigningOut}
          onSignOut={() => {
            void handleSignOut();
          }}
        />
        <div className={LAYOUT.content()} data-slot="admin-content">
          <Outlet />
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
