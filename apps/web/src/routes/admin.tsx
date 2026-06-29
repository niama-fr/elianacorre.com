import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { readRootLayout } from "@ec/domain/helpers/layouts";
import { Button } from "@ec/ui/components/button";
import { Image } from "@ec/ui/components/image";
import { ModeToggle } from "@ec/ui/components/mode-toggle";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarContent,
} from "@ec/ui/components/sidebar";
import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import { authClient } from "@/lib/auth/client";
import { fetchToken } from "@/lib/auth/functions";

import styleCss from "@/styles/admin.css?url";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/admin")({
  beforeLoad: async (ctx) => {
    const token = await fetchToken();
    if (token === undefined) redirect({ search: { redirect: ctx.location.href }, throw: true, to: "/connexion" });
    if (token !== undefined) ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    return { token };
  },
  component: AdminLayout,
  head: () => ({
    links: [{ href: styleCss, rel: "stylesheet" }],
  }),
  loader: () => readRootLayout(),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const ADMIN = {
  actions: cva("flex items-center gap-2"),
  header: cva("flex h-16 shrink-0 justify-between items-center gap-2"),
  inset: cva("p-4"),
  signout: cva("icon-[lucide--log-out]"),
};

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function AdminLayout() {
  const { logoImg } = Route.useLoaderData();
  const { convexQueryClient, token } = Route.useRouteContext();

  const data = {
    navMain: [{ title: "Ebooks", url: "/admin/ebooks" }],
  };

  return (
    // @ts-expect-error -- The documented client construction is incompatible with the package's AuthClient type under TypeScript 6.
    <ConvexBetterAuthProvider client={convexQueryClient.convexClient} authClient={authClient} initialToken={token}>
      <SidebarProvider>
        <Sidebar variant="floating">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <div className="aspect-square size-16">
                    <Image
                      alt={logoImg.alt}
                      background="transparent"
                      breakpoints={[80, 96, 160, 192, 320]}
                      height={logoImg.height}
                      sizes="(min-width: 768px) 160px, (min-width: 640px) 96px, 80px"
                      src={logoImg.src}
                      width={logoImg.width}
                    />
                  </div>
                  <span>Tableau de bord</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton render={<Link to={item.url} />}>{item.title}</SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className={ADMIN.inset()}>
          <header className={ADMIN.header()}>
            <SidebarTrigger />
            <div className={ADMIN.actions()}>
              <Button
                size="icon"
                onClick={() =>
                  void authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        location.reload();
                      },
                    },
                  })
                }
              >
                <span className={ADMIN.signout()} />
              </Button>
              <ModeToggle />
            </div>
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </ConvexBetterAuthProvider>
  );
}
