import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import { Button } from "@ec/ui/components/button";
import { ModeToggle } from "@ec/ui/components/mode-toggle";
import { Separator } from "@ec/ui/components/separator";
import { SidebarTrigger } from "@ec/ui/components/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ec/ui/components/tooltip";
import { Link, useMatches, useNavigate } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import * as m from "@/paraglide/messages";

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const ADMIN_HEADER = {
  breadcrumbLink: cva("text-muted-foreground hover:text-foreground shrink-0 transition-colors"),
  breadcrumbs: cva("flex min-w-0 items-center gap-2 overflow-hidden text-sm"),
  createIcon: cva("icon-[tabler--plus] size-4"),
  current: cva("flex min-w-0 items-center gap-2 [&>span:last-child]:truncate"),
  navigation: cva("min-w-0 overflow-hidden"),
  root: cva("flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2"),
  side: cva("flex min-w-0 shrink items-center gap-2 last:shrink-0"),
  signOutIcon: cva("icon-[lucide--log-out]"),
};

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export function AdminHeader({ isSigningOut, onSignOut }: AdminHeaderProps) {
  const matches = useMatches();
  const navigate = useNavigate();
  const display = getAdminHeaderDisplay(matches);

  return (
    <header className={ADMIN_HEADER.root()}>
      <div className={ADMIN_HEADER.side()}>
        <SidebarTrigger label={m.slimy_eels_drum()} />
        <Separator orientation="vertical" />
        {display.section === "travelPacks" && (
          <nav aria-label={m.cute_badgers_end()} className={ADMIN_HEADER.navigation()}>
            <ol className={ADMIN_HEADER.breadcrumbs()}>
              <li>
                <Link className={ADMIN_HEADER.breadcrumbLink()} to="/admin/packs">
                  {m.cute_badgers_end()}
                </Link>
              </li>
              {display.currentTitle && (
                <li className={ADMIN_HEADER.current()}>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">{display.currentTitle}</span>
                </li>
              )}
            </ol>
          </nav>
        )}
      </div>
      <div className={ADMIN_HEADER.side()}>
        {display.showTravelPackCreate && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={m.odd_onions_sniff()}
                  size="icon"
                  type="button"
                  onClick={() => {
                    void navigate({ search: { create: true }, to: "/admin/packs" });
                  }}
                />
              }
            >
              <span className={ADMIN_HEADER.createIcon()} />
            </TooltipTrigger>
            <TooltipContent>{m.odd_onions_sniff()}</TooltipContent>
          </Tooltip>
        )}
        <ModeToggle label={m.odd_wombats_decide()} />
        <Button aria-label={m.tame_poems_shine()} disabled={isSigningOut} size="icon" title={m.tame_poems_shine()} onClick={onSignOut}>
          <span className={ADMIN_HEADER.signOutIcon()} />
        </Button>
      </div>
    </header>
  );
}
type AdminHeaderProps = { isSigningOut: boolean; onSignOut: () => void };

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
function isTravelPackDto(value: unknown): value is TravelPacks["Dto"] {
  return typeof value === "object" && value !== null && "title" in value && typeof value.title === "string";
}

export function getAdminHeaderDisplay(matches: readonly AdminRouteMatch[]): AdminHeaderDisplay {
  const detail = matches.find(({ routeId }) => routeId === "/_authenticated/admin/packs/$packId");
  if (detail)
    return {
      currentTitle: isTravelPackDto(detail.loaderData) ? detail.loaderData.title : undefined,
      section: "travelPacks",
      showTravelPackCreate: false,
    };

  const list = matches.some(({ routeId }) => routeId === "/_authenticated/admin/packs/");
  return list
    ? { currentTitle: undefined, section: "travelPacks", showTravelPackCreate: true }
    : { currentTitle: undefined, section: undefined, showTravelPackCreate: false };
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type AdminRouteMatch = { loaderData?: unknown; routeId: string };
type AdminHeaderDisplay = {
  currentTitle: string | undefined;
  section: "travelPacks" | undefined;
  showTravelPackCreate: boolean;
};
