import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import type { Id } from "@ec/backend/types";
import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import { Alert } from "@ec/ui/components/alert";
import { Button } from "@ec/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@ec/ui/components/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ec/ui/components/table";
import { useAppForm } from "@ec/ui/hooks/app-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FlexRender, useTable } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import { toast } from "sonner";
import { z } from "zod";

import { zTravelPackCreateValues } from "@/features/travel-packs/schemas";
import * as m from "@/paraglide/messages";

import { features, getColumns } from "./-table-features";

const travelPacksQuery = convexQuery(api.travelPacks.list);
const searchSchema = z.object({ create: z.boolean().optional() });

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/admin/packs/")({
  component: TravelPacksPage,
  loader: async ({ context: { queryClient } }) => await queryClient.ensureQueryData(travelPacksQuery),
  validateSearch: searchSchema,
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const columnStyles: Record<string, ReturnType<typeof cva> | undefined> = {
  actions: cva("w-16 text-right"),
  destination: cva("hidden md:table-cell"),
  updatedAt: cva("hidden lg:table-cell"),
};

const PAGE = {
  createForm: cva("flex flex-col gap-6"),
  empty: cva("h-24 text-center"),
  root: cva("flex flex-col gap-8"),
  srOnly: cva("sr-only"),
  tableFrame: cva("border-border overflow-hidden rounded-xl border"),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function TravelPacksPage() {
  return (
    <section className={PAGE.root()}>
      <h1 className={PAGE.srOnly()}>{m.fruity_lines_drop()}</h1>
      <TravelPackTable />
      <TravelPackCreateDialogRoute />
    </section>
  );
}

// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------
export function TravelPackTable() {
  const { data } = useSuspenseQuery(travelPacksQuery);
  const table = useTable({ columns: getColumns(), data, features });
  const { rows } = table.getRowModel();
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className={PAGE.tableFrame()}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead className={columnStyles[header.column.id]?.()} key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder ? null : <FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell className={columnStyles[cell.column.id]?.()} key={cell.id}>
                  <FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell className={PAGE.empty()} colSpan={columnCount}>
                <Alert>{m.plenty_geckos_spend()}</Alert>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TravelPackCreateDialogRoute() {
  const { create } = Route.useSearch();
  const navigate = useNavigate();
  const createDraft = useMutation({ mutationFn: useConvexMutation(api.travelPacks.create) });
  return (
    <TravelPackCreateDialog
      createDraft={async (input) => await createDraft.mutateAsync(input)}
      open={create === true}
      onClose={() => {
        void navigate({ replace: true, search: {}, to: "/admin/packs" });
      }}
      onCreated={async (packId) => {
        await navigate({ params: { packId }, to: "/admin/packs/$packId" });
      }}
    />
  );
}

export function TravelPackCreateDialog({ createDraft, onClose, onCreated, open }: TravelPackCreateDialogProps) {
  const form = useAppForm({
    defaultValues: { title: "" },
    onSubmit: async ({ value }) => {
      const title = zTravelPackCreateValues.shape.title.parse(value.title);
      try {
        const result = await createDraft({ title });
        if (result.error) throw new Error(result.error);
        if (!result.data) throw new Error("TRAVEL_PACK_CREATE_FAILED");
        form.reset();
        await onCreated(result.data);
      } catch (error) {
        toast.error(error instanceof Error && error.message === "TRAVEL_PACK_SLUG_TAKEN" ? m.hip_crabs_lie() : m.polite_stars_spend());
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{m.silly_hoops_wait()}</DialogTitle>
        </DialogHeader>
        <form
          className={PAGE.createForm()}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppForm>
            <form.AppField name="title" validators={{ onChange: zTravelPackCreateValues.shape.title }}>
              {(field) => <field.InputField autoFocus label={m.strong_aliens_flash()} type="text" />}
            </form.AppField>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{m.honest_windows_shout()}</DialogClose>
              <form.Submit label={m.six_jeans_kneel()} icon="icon-[tabler--plus]" />
            </DialogFooter>
          </form.AppForm>
        </form>
      </DialogContent>
    </Dialog>
  );
}
type TravelPackCreateDialogProps = {
  createDraft: (
    input: TravelPacks["Create"]
  ) => Promise<{ data: Id<"travelPacks">; error?: undefined } | { data?: undefined; error: string }>;
  onClose: () => void;
  onCreated: (packId: Id<"travelPacks">) => Promise<void>;
  open: boolean;
};
