import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import type { Id } from "@ec/backend/types";
import { formatSize } from "@ec/domain/helpers/ebooks";
import { zEbookCreateValues, type Ebooks } from "@ec/domain/schemas/ebooks";
import { Alert } from "@ec/ui/components/alert";
import { Item, ItemHeader, ItemTitle, ItemContent } from "@ec/ui/components/item";
import { Skeleton } from "@ec/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ec/ui/components/table";
import { useAppForm } from "@ec/ui/hooks/admin-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
// import { createServerFn } from "@tanstack/react-start";
import { useTable, FlexRender } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import { toast } from "sonner";
// import { fetchAuthQuery } from "@/lib/auth/index.server";

import { features, getColumns } from "./ebooks/-table-features";

// SERVER ----------------------------------------------------------------------------------------------------------------------------------
// export const fetchAllEbooks = createServerFn({ method: "GET" }).handler(async () => await fetchAuthQuery(api.ebooks.readAll));

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/admin/ebooks")({
  component: AdminEbooksPage,
  // loader: async () => ({ ebooks: await fetchAllEbooks() }),
});

const ADMIN = {
  action: cva(
    "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 font-semibold text-sm transition hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
  ),
  badge: cva("inline-flex w-fit rounded-full px-2 py-1 font-semibold text-xs", {
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
  error: cva("rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800 text-sm"),
  field: cva("flex flex-col gap-2"),
  form: cva("grid gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end"),
  input: cva("h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm"),
  item: cva("border-dashed border border-border rounded-none"),
  label: cva("font-semibold text-neutral-800 text-sm"),
  muted: cva("text-muted-foreground text-sm"),
  table: cva("w-full border-collapse overflow-hidden rounded-md text-left text-sm"),
  tableCell: cva("border-neutral-200 border-t px-3 py-3 align-middle"),
  tableHead: cva("bg-neutral-100 px-3 py-2 font-semibold text-neutral-700"),
  title: cva("font-extrabold text-3xl text-foreground"),
};

function AdminEbooksPage() {
  // const d = Route.useLoaderData();

  return (
    <section className={ADMIN.base()}>
      <header>
        <h1 className={ADMIN.title()}>Publication de l'e-book</h1>
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
    ...convexQuery(api.ebooks.readAll),
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
    defaultValues: { file: null, title: "" } as Ebooks["CreateDefaultValues"],
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
              {(f) => <f.FileInputField label="Fichier" accept="application/pdf,.pdf" />}
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
  const { data, isLoading, isError, isFetched } = useSuspenseQuery(convexQuery(api.ebooks.readAll));
  const publish = useMutation({ mutationFn: useConvexMutation(api.ebooks.publish) });

  const table = useTable({
    columns: getColumns({
      publish: async (_id: Id<"ebooks">) => await publish.mutateAsync({ _id }),
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
      <ItemContent></ItemContent>
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
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {visibleColumns.map(({ id }) => (
                  <TableCell key={id}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
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

          {isError && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                Error loading jobs.
              </TableCell>
            </TableRow>
          )}
          {isFetched && !hasRows && (
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
