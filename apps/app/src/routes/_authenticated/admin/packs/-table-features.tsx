import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import { Button } from "@ec/ui/components/button";
import { Link } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { cva } from "class-variance-authority";

import { TravelPackStatusBadge } from "@/features/travel-packs/status-badge";
import * as m from "@/paraglide/messages";

// FEATURES --------------------------------------------------------------------------------------------------------------------------------
export const features = tableFeatures({});

// DISPLAY ---------------------------------------------------------------------------------------------------------------------------------
export const formatUpdatedAt = (value: number) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const TRAVEL_PACK_TABLE = {
  editIcon: cva("icon-[tabler--pencil] size-4"),
  titleLink: cva("font-medium underline-offset-4 hover:underline"),
};

// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------
const helper = createColumnHelper<typeof features, TravelPacks["Dto"]>();

export const getColumns = () =>
  helper.columns([
    helper.accessor("title", {
      cell: ({ row }) => (
        <Link className={TRAVEL_PACK_TABLE.titleLink()} params={{ packId: row.original._id }} to="/admin/packs/$packId">
          {row.original.title}
        </Link>
      ),
      header: m.slow_tigers_call(),
    }),
    helper.accessor("destination", {
      cell: ({ getValue }) => getValue() || "—",
      header: m.short_mammals_allow(),
    }),
    helper.accessor("status", {
      cell: ({ getValue }) => <TravelPackStatusBadge status={getValue()} />,
      header: m.fancy_spiders_lead(),
    }),
    helper.accessor("updatedAt", {
      cell: ({ getValue }) => formatUpdatedAt(getValue()),
      header: m.spotty_clubs_give(),
    }),
    helper.display({
      cell: ({ row }) => (
        <Button
          aria-label={m.whole_hairs_obey()}
          nativeButton={false}
          render={<Link params={{ packId: row.original._id }} to="/admin/packs/$packId" />}
          size="icon-sm"
          variant="ghost"
        >
          <span className={TRAVEL_PACK_TABLE.editIcon()} />
        </Button>
      ),
      header: m.green_aliens_read(),
      id: "actions",
    }),
  ]);
