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

import * as m from "@/paraglide/messages";

// DISPLAY ---------------------------------------------------------------------------------------------------------------------------------
const nav = linkOptions([
  { title: m.cute_badgers_end(), to: "/admin/packs" },
  { title: "Ebooks", to: "/admin/ebooks" },
  { title: "Opérations e-mail", to: "/admin/email-operations" },
  { title: "Confidentialité", to: "/admin/privacy" },
]);

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
export const ADMIN_SIDEBAR = {
  header: cva("font-heading h-auto gap-2 text-3xl"),
  logoWrapper: cva("size-12 rounded-md bg-white"),
};

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
export function AdminSidebar({ logoImg }: { logoImg: Images["Entity"] }) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className={ADMIN_SIDEBAR.header()}>
              <div className={ADMIN_SIDEBAR.logoWrapper()}>
                <Image
                  {...logoImg}
                  background="transparent"
                  breakpoints={[80, 96, 160, 192, 320]}
                  sizes="(min-width: 768px) 160px, (min-width: 640px) 96px, 80px"
                />
              </div>
              <span>{m.hot_shoes_divide()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {nav.map(({ title, ...link }) => (
              <SidebarMenuItem key={link.to}>
                <Link {...link}>{({ isActive }) => <SidebarMenuButton isActive={isActive}>{title}</SidebarMenuButton>}</Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
