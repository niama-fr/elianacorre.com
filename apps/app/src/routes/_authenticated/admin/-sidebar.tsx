import type { Images } from "@ec/domain/helpers/images";
import { Image } from "@ec/ui/components/image";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarContent,
} from "@ec/ui/components/sidebar";
import { Link, linkOptions } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const ADMIN = {
  actions: cva("flex items-center gap-2"),
  header: cva("flex h-16 shrink-0 items-center justify-between gap-2"),
  inset: cva("p-4"),
  signout: cva("icon-[lucide--log-out]"),
};

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
export function AdminSidebar({ logoImg }: { logoImg: Images["Entity"] }) {
  const data = {
    navMain: linkOptions([
      { title: "Ebooks", to: "/admin/ebooks" },
      { title: "Opérations e-mail", to: "/admin/email-operations" },
      { title: "Confidentialité", to: "/admin/privacy" },
    ]),
  };

  return (
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
            {data.navMain.map(({ title, ...link }) => (
              <SidebarMenuItem key={title}>
                <SidebarMenuButton render={<Link {...link} />}>{title}</SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
