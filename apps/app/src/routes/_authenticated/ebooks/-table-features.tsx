import type { Id } from "@ec/backend/types";
import { formatSize } from "@ec/domain/helpers/ebooks";
import type { Ebooks } from "@ec/domain/schemas/ebooks";
import { Badge } from "@ec/ui/components/badge";
import { Button } from "@ec/ui/components/button";
import { ButtonGroup } from "@ec/ui/components/button-group";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";

// FEATURES --------------------------------------------------------------------------------------------------------------------------------
export const features = tableFeatures({});

// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------
const OpenFileBtn = ({ href }: { href: string }) => (
  <Button variant="secondary" size="icon">
    <a href={href} rel="noreferrer" target="_blank" aria-label="Lien externe" className="size-4">
      <span className="icon-[tabler--link] size-4" />
    </a>
  </Button>
);

// COLUMNS ---------------------------------------------------------------------------------------------------------------------------------
const helper = createColumnHelper<typeof features, Ebooks["Entity"]>();

export const getColumns = ({ publish }: GetColumnsArgs) =>
  helper.columns([
    helper.accessor("version", {
      cell: (info) => <Badge className="size-5">{info.getValue()}</Badge>,
      header: "Version",
    }),
    { accessorKey: "title", header: "Titre" },
    helper.accessor("status", {
      cell: (info) => {
        const m = {
          archived: { label: "Archivé", variant: "secondary" },
          draft: { label: "Brouillon", variant: "warn" },
          published: { label: "Publié", variant: "success" },
        } as const;
        const { label, variant } =
          info.row.original.url === null ? ({ label: "Corrompu", variant: "destructive" } as const) : m[info.getValue()];
        return <Badge variant={variant}>{label}</Badge>;
      },
      header: "Statut",
    }),
    helper.accessor("fileName", {
      cell: ({ row }) => `${row.original.fileName} · ${row.original.size === null ? "Fichier corrompu" : formatSize(row.original.size)}`,
      header: "Fichier",
    }),
    helper.display({
      cell: ({ row: { original } }) => {
        if (original.url === null) return null;
        if (original.status === "published") return <OpenFileBtn href={original.url} />;
        return (
          <ButtonGroup>
            <OpenFileBtn href={original.url} />
            <Button variant="success" size="icon" onClick={() => void publish(original._id)}>
              <span className="icon-[tabler--check] size-4" />
            </Button>
          </ButtonGroup>
        );
      },
      header: "Actions",
      id: "actions",
    }),
  ]);
type GetColumnsArgs = {
  publish: (args: Id<"ebooks">) => Promise<Id<"ebooks">>;
};
