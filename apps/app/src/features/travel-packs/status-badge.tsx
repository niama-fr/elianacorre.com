import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import { Badge } from "@ec/ui/components/badge";
import { cva } from "class-variance-authority";

import * as m from "@/paraglide/messages.js";

// DISPLAY ---------------------------------------------------------------------------------------------------------------------------------
const statusDisplay = {
  archived: { label: m.proud_years_think },
  draft: { label: m.metal_garlics_retire },
  published: { label: m.gold_flies_send },
} satisfies Record<TravelPacks["Status"], { label: () => string }>;

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const STATUS_BADGE = {
  root: cva(
    "data-[status=archived]:bg-muted data-[status=archived]:text-muted-foreground data-[status=draft]:bg-warn data-[status=draft]:text-warn-foreground data-[status=published]:bg-success data-[status=published]:text-success-foreground"
  ),
};

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export function TravelPackStatusBadge(props: TravelPackStatusBadgeProps) {
  const display = statusDisplay[props.status];
  return (
    <Badge className={STATUS_BADGE.root()} data-status={props.status}>
      {display.label()}
    </Badge>
  );
}
type TravelPackStatusBadgeProps = { status: TravelPacks["Status"] };
