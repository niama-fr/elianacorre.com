import { PaginatedQueryResult } from "@confect/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import refs from "@ec/backend/refs";
import { Alert } from "@ec/ui/components/alert";
import { Button } from "@ec/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@ec/ui/components/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ec/ui/components/table";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FlexRender, useTable } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import { Schema as S } from "effect";
import { toast } from "sonner";

import { sTravelPackCreateForm, sTravelPackSearch } from "@/features/travel-packs/travel-packs.schemas";
import { useAppForm } from "@/form/hook";
import { usePaginatedQuery } from "@/infra/confect/helpers";
import * as m from "@/paraglide/messages";

import { features, getColumns } from "./-table-features";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const PAGE_SIZE = 25;

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/admin/packs/")({
  component: TravelPacksPage,
  validateSearch: S.toStandardSchemaV1(sTravelPackSearch),
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
  const query = usePaginatedQuery(refs.public.travelPacks.list, {}, { initialNumItems: PAGE_SIZE });
  const table = useTable({ columns: getColumns(), data: query.results, features });
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
      {PaginatedQueryResult.isCanLoadMore(query) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            query.loadMore(PAGE_SIZE);
          }}
        >
          {m.warm_taxis_smile()}
        </Button>
      )}
    </div>
  );
}

function TravelPackCreateDialogRoute() {
  const { create } = Route.useSearch();
  const navigate = useNavigate();
  const createDraft = useMutation({ mutationFn: useConvexMutation(api.travelPacks.create) });

  const form = useAppForm({
    defaultValues: { title: "" },
    onSubmit: async ({ value }) => {
      try {
        const result = await createDraft.mutateAsync(value);
        if ("error" in result) throw new Error(result.error);
        form.reset();
        await navigate({ params: { packId: result.data }, to: "/admin/packs/$packId" });
      } catch {
        toast.error(m.polite_stars_spend());
      }
    },
  });

  return (
    <Dialog
      open={create}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset();
          void navigate({ replace: true, search: {}, to: "/admin/packs" });
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
            <form.AppField name="title" validators={{ onChange: S.toStandardSchemaV1(sTravelPackCreateForm.fields.title) }}>
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
