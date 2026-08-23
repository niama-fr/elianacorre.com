import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import type { Id } from "@ec/backend/types";
import { formatSize } from "@ec/domain/helpers/ebooks";
import { Alert } from "@ec/ui/components/alert";
import { Item, ItemHeader, ItemTitle, ItemContent } from "@ec/ui/components/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ec/ui/components/table";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTable, FlexRender } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import { toast } from "sonner";

import { zEbookCreateValues, type EbookCreateValues } from "@/features/ebooks/schemas";
import { useAppForm } from "@/form/hook";

import { features, getColumns } from "./-table-features";

// QUERY -----------------------------------------------------------------------------------------------------------------------------------
const ebooksQuery = convexQuery(api.ebooks.list);

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/admin/ebooks/")({
  component: EbooksPage,
  loader: async ({ context: { queryClient } }) => await queryClient.ensureQueryData(ebooksQuery),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const PAGE = {
  base: cva("flex flex-col gap-8"),
  item: cva("border-border rounded-none border border-dashed"),
  muted: cva("text-muted-foreground text-sm"),
  title: cva("text-foreground text-3xl font-extrabold"),
};

function EbooksPage() {
  return (
    <section className={PAGE.base()}>
      <header>
        <h1 className={PAGE.title()}>Publication de l&apos;e-book</h1>
        <p className={PAGE.muted()}>Administration réservée aux adresses Google Workspace explicitement autorisées.</p>
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
    <Item className={PAGE.item()}>
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
  const generateUploadUrl = useMutation({ mutationFn: useConvexMutation(api.storage.generateUploadUrl) });
  const create = useMutation({ mutationFn: useConvexMutation(api.ebooks.create) });

  const defaultValues: EbookCreateValues = { file: null, title: "" };

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value: { file, title } }) => {
      if (file === null) return;

      try {
        const uploadUrl = await generateUploadUrl.mutateAsync({});
        const uploadResponse = await fetch(uploadUrl, { body: file, headers: { "Content-Type": file.type }, method: "POST" });
        if (!uploadResponse.ok) throw new Error("Le téléversement du fichier a echoué.");
        const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
        await create.mutateAsync({ fileName: file.name, storageId, title });
        form.reset();
      } catch {
        toast.error("L'enregistrement de la nouvelle version a echoué.");
      }
    },
  });

  return (
    <Item className={PAGE.item()}>
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
    <Item className={PAGE.item()}>
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
