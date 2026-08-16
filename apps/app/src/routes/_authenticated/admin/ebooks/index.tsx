import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import type { Id } from "@ec/backend/types";
import { formatSize } from "@ec/domain/helpers/ebooks";
import { MAX_SIZE, PDF_ACCEPTED_TYPES } from "@ec/domain/helpers/storage";
import { Alert } from "@ec/ui/components/alert";
import { Item, ItemHeader, ItemTitle, ItemContent } from "@ec/ui/components/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ec/ui/components/table";
import { useAppForm } from "@ec/ui/hooks/app-form";
import { z } from "@ec/validation/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTable, FlexRender } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import { toast } from "sonner";

import * as m from "@/paraglide/messages";

import { features, getColumns } from "./-table-features";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
export const zEbookCreateValues = z.object({
  file: z
    .file({ error: m.dull_things_work() })
    .max(MAX_SIZE, { error: m.tiny_mugs_study() })
    .mime([...PDF_ACCEPTED_TYPES], { error: m.dull_things_work() })
    .nullable()
    .refine((file) => file !== null, { error: m.dull_things_work() }),
  title: z.string().trim().min(1, { error: m.wide_berries_stop() }),
});

export type EbookCreateDefaultValues = z.input<typeof zEbookCreateValues>;

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const ebooksQuery = convexQuery(api.ebooks.list);
const ebookCreateDefaultValues: EbookCreateDefaultValues = { file: null, title: "" };

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/admin/ebooks/")({
  component: EbooksPage,
  loader: async ({ context: { queryClient } }) => await queryClient.ensureQueryData(ebooksQuery),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const ADMIN = {
  action: cva(
    "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold transition hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
  ),
  badge: cva("inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold", {
    variants: {
      status: {
        archived: "bg-neutral-200 text-neutral-700",
        draft: "bg-amber-100 text-amber-800",
        published: "bg-emerald-100 text-emerald-800",
      },
    },
  }),
  base: cva("flex flex-col gap-8"),
  controls: cva("flex flex-wrap items-center gap-3"),
  error: cva("rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"),
  field: cva("flex flex-col gap-2"),
  form: cva("grid gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end"),
  input: cva("h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm"),
  item: cva("border-border rounded-none border border-dashed"),
  label: cva("text-sm font-semibold text-neutral-800"),
  muted: cva("text-muted-foreground text-sm"),
  table: cva("w-full border-collapse overflow-hidden rounded-md text-left text-sm"),
  tableCell: cva("border-t border-neutral-200 px-3 py-3 align-middle"),
  tableHead: cva("bg-neutral-100 px-3 py-2 font-semibold text-neutral-700"),
  title: cva("text-foreground text-3xl font-extrabold"),
};

function EbooksPage() {
  return (
    <section className={ADMIN.base()}>
      <header>
        <h1 className={ADMIN.title()}>Publication de l&apos;e-book</h1>
        <p className={ADMIN.muted()}>Administration réservée aux adresses Google Workspace explicitement autorisées.</p>
      </header>
      <EbookCurrentVersion />
      <EbookForm />
      <EbookItems />
    </section>
  );
}

// CURRENT VERSION -------------------------------------------------------------------------------------------------------------------------
function EbookCurrentVersion() {
  const { data } = useSuspenseQuery({
    ...ebooksQuery,
    select: (docs) => docs.find(({ status }) => status === "published"),
  });

  return (
    <Item className={ADMIN.item()}>
      <ItemHeader>
        <ItemTitle>Version publiée</ItemTitle>
      </ItemHeader>
      <ItemContent>
        {data ? (
          <p>
            Version {data.version} · {data.title} · {formatSize(data.size ?? 0)}
          </p>
        ) : (
          <Alert>Aucune version publiée pour le moment.</Alert>
        )}
      </ItemContent>
    </Item>
  );
}

// FORM ------------------------------------------------------------------------------------------------------------------------------------
function EbookForm() {
  const generateUploadUrl = useMutation({ mutationFn: useConvexMutation(api.ebooks.generateUploadUrl) });
  const create = useMutation({ mutationFn: useConvexMutation(api.ebooks.create) });

  const form = useAppForm({
    defaultValues: ebookCreateDefaultValues,
    onSubmit: async ({ value: { file, title } }) => {
      if (file === null) return;

      try {
        const uploadUrl = await generateUploadUrl.mutateAsync({});
        const uploadResponse = await fetch(uploadUrl, { body: file, headers: { "Content-Type": file.type }, method: "POST" });
        if (!uploadResponse.ok) throw new Error("Le téléversement du fichier a echoué.");
        const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
        const { error } = await create.mutateAsync({ fileName: file.name, storageId, title });
        if (error !== undefined) throw new Error(error);
        form.reset();
      } catch {
        toast.error("L'enregistrement de la nouvelle version a echoué.");
      }
    },
  });

  return (
    <Item className={ADMIN.item()}>
      <ItemHeader>
        <ItemTitle>Nouvelle version</ItemTitle>
      </ItemHeader>
      <ItemContent>
        <form
          className="flex w-full flex-col items-end gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppForm>
            <form.AppField name="title" validators={{ onChange: zEbookCreateValues.shape.title }}>
              {(f) => <f.InputField label="Titre" type="text" />}
            </form.AppField>
            <form.AppField name="file" validators={{ onChange: zEbookCreateValues.shape.file }}>
              {(f) => <f.FileInputField label="Fichier" removeLabel="Supprimer le fichier" accept="application/pdf,.pdf" />}
            </form.AppField>
            <form.Submit label="Enregistrer le brouillon" icon="icon-[tabler--circle-plus]" />
          </form.AppForm>
        </form>
      </ItemContent>
    </Item>
  );
}

// TABLE -----------------------------------------------------------------------------------------------------------------------------------
function EbookItems() {
  const { data } = useSuspenseQuery(ebooksQuery);
  const publish = useMutation({ mutationFn: useConvexMutation(api.ebooks.publish) });

  const table = useTable({
    columns: getColumns({
      publish: async (ebookId: Id<"ebooks">) => await publish.mutateAsync({ ebookId }),
    }),
    data,
    features,
  });

  const { rows } = table.getRowModel();
  const visibleColumns = table.getAllLeafColumns();
  const hasRows = rows.length > 0;

  return (
    <Item className={ADMIN.item()}>
      <ItemHeader>
        <ItemTitle>Versions existantes</ItemTitle>
      </ItemHeader>
      <ItemContent />
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(({ headers, id }) => (
            <TableRow key={id}>
              {headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder ? null : <FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {hasRows &&
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!hasRows && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                <Alert>Aucune version publiée pour le moment.</Alert>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Item>
  );
}
