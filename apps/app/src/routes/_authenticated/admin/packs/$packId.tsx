import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import type { Id } from "@ec/backend/types";
import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import { Button } from "@ec/ui/components/button";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "@ec/ui/components/item";
import { useAppForm } from "@ec/ui/hooks/app-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { toast } from "sonner";

import { type TravelPackUpdateDefaultValues, zTravelPackUpdateValues } from "@/features/travel-packs/schemas";
import { TravelPackStatusBadge } from "@/features/travel-packs/status-badge";
import * as m from "@/paraglide/messages";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/admin/packs/$packId")({
  component: TravelPackDetailPage,
  loader: async ({ context: { queryClient }, params: { packId } }) =>
    await queryClient.ensureQueryData(convexQuery(api.travelPacks.get, { travelPackId: packId })),
});

// STYLES ----------------------------------------------------------------------------------------------------------------------------------
const TRAVEL_PACK_DETAIL_PAGE = {
  form: cva("flex w-full flex-col items-end gap-4"),
  item: cva("border-border rounded-none border border-dashed"),
  root: cva("flex flex-col gap-8"),
  srOnly: cva("sr-only"),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------
function TravelPackDetailPage() {
  const { packId } = Route.useParams();
  const id = packId as Id<"travelPacks">;
  const { data } = useSuspenseQuery(convexQuery(api.travelPacks.get, { travelPackId: id }));

  return (
    <section className={TRAVEL_PACK_DETAIL_PAGE.root()}>
      <h1 className={TRAVEL_PACK_DETAIL_PAGE.srOnly()}>{data.title}</h1>
      <TravelPackStatusBadge status={data.status} />
      <TravelPackUpdateForm data={data} travelPackId={id} />
    </section>
  );
}

// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------
function TravelPackUpdateForm({ data, travelPackId }: TravelPackUpdateFormProps) {
  const generateUploadUrl = useConvexMutation(api.travelPacks.generateUploadUrl);
  const update = useMutation({ mutationFn: useConvexMutation(api.travelPacks.update) });
  const queryClient = useQueryClient();
  const defaultValues: TravelPackUpdateDefaultValues = {
    cover: null,
    description: data.description,
    destination: data.destination,
    excerpt: data.excerpt,
    pdf: null,
    slug: data.slug,
    title: data.title,
    youtubeUrl: data.youtubeUrl ?? "",
  };
  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const { cover, description, destination, excerpt, pdf, slug, title, youtubeUrl } = zTravelPackUpdateValues.parse(value);
      try {
        const [coverStorageId, pdfStorageId] = await Promise.all([
          cover ? uploadFile(cover, async () => await generateUploadUrl({})) : null,
          pdf ? uploadFile(pdf, async () => await generateUploadUrl({})) : null,
        ]);
        const result = await update.mutateAsync({
          patch: {
            cover: cover && coverStorageId ? { coverFileName: cover.name, coverStorageId } : null,
            description,
            destination,
            excerpt,
            pdf: pdf && pdfStorageId ? { pdfFileName: pdf.name, pdfStorageId } : null,
            slug,
            title,
            youtubeUrl,
          },
          travelPackId,
        });
        if (result.error) throw new Error(result.error);
        form.setFieldValue("cover", null);
        form.setFieldValue("pdf", null);
        form.setFieldValue("slug", slug);
        toast.success(m.great_dancers_stare());
      } catch (error) {
        toast.error(error instanceof Error && error.message === "TRAVEL_PACK_SLUG_TAKEN" ? m.hip_crabs_lie() : m.fancy_comics_double());
      }
    },
  });

  const regenerateSlug = async () => {
    try {
      await regenerateSlugFromTitle({
        setSlug: (slug) => {
          form.setFieldValue("slug", slug);
        },
        suggestSlug: async (title) => await queryClient.fetchQuery(convexQuery(api.travelPacks.suggestSlug, { title, travelPackId })),
        title: form.getFieldValue("title"),
      });
    } catch {
      toast.error(m.frank_socks_hide());
    }
  };

  return (
    <Item className={TRAVEL_PACK_DETAIL_PAGE.item()}>
      <ItemHeader>
        <ItemTitle>{m.ripe_lands_fall()}</ItemTitle>
      </ItemHeader>
      <ItemContent>
        <ItemDescription>
          {m.grumpy_spies_happen({
            coverFileName: data.coverFileName ?? m.social_boats_pay(),
            pdfFileName: data.pdfFileName ?? m.large_bikes_pull(),
          })}
        </ItemDescription>
        <form
          className={TRAVEL_PACK_DETAIL_PAGE.form()}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppForm>
            <form.AppField name="title" validators={{ onChange: zTravelPackUpdateValues.shape.title }}>
              {(field) => <field.InputField label={m.strong_aliens_flash()} type="text" />}
            </form.AppField>
            <form.AppField name="slug" validators={{ onChange: zTravelPackUpdateValues.shape.slug }}>
              {(field) => (
                <field.InputField
                  action={
                    <Button
                      disabled={data.status !== "draft"}
                      size="xs"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // oxlint-disable-next-line eslint/no-void -- event handlers cannot return promises.
                        void regenerateSlug();
                      }}
                    >
                      {m.goofy_bananas_call()}
                    </Button>
                  }
                  disabled={data.status !== "draft"}
                  label={m.nice_bats_travel()}
                  type="text"
                />
              )}
            </form.AppField>
            <form.AppField name="destination" validators={{ onChange: zTravelPackUpdateValues.shape.destination }}>
              {(field) => <field.InputField label={m.many_ties_know()} type="text" />}
            </form.AppField>
            <form.AppField name="excerpt" validators={{ onChange: zTravelPackUpdateValues.shape.excerpt }}>
              {(field) => <field.TextareaField label={m.hungry_hounds_fly()} description={m.mighty_boats_hug()} />}
            </form.AppField>
            <form.AppField name="description" validators={{ onChange: zTravelPackUpdateValues.shape.description }}>
              {(field) => (
                <field.MarkdownField
                  description={m.goofy_suits_enjoy()}
                  editLabel={m.humble_wasps_retire()}
                  label={m.light_rooms_grab()}
                  modeLabel={m.fuzzy_olives_agree({ field: m.light_rooms_grab() })}
                  previewLabel={m.yummy_trains_design()}
                />
              )}
            </form.AppField>
            <form.AppField name="youtubeUrl" validators={{ onChange: zTravelPackUpdateValues.shape.youtubeUrl }}>
              {(field) => <field.InputField label={m.free_ideas_cut()} type="url" />}
            </form.AppField>
            <form.AppField name="cover" validators={{ onChange: zTravelPackUpdateValues.shape.cover }}>
              {(field) => (
                <field.FileInputField
                  accept="image/jpeg,image/png,image/webp"
                  label={m.funny_coins_like()}
                  removeLabel={m.hot_friends_hunt()}
                />
              )}
            </form.AppField>
            <form.AppField name="pdf" validators={{ onChange: zTravelPackUpdateValues.shape.pdf }}>
              {(field) => (
                <field.FileInputField accept="application/pdf,.pdf" label={m.salty_points_tickle()} removeLabel={m.hot_friends_hunt()} />
              )}
            </form.AppField>
            <form.Submit disabled={data.status !== "draft"} label={m.some_icons_smile()} icon="icon-[tabler--device-floppy]" />
          </form.AppForm>
        </form>
      </ItemContent>
    </Item>
  );
}
type TravelPackUpdateFormProps = { data: TravelPacks["Dto"]; travelPackId: Id<"travelPacks"> };

// HELPERS ----------------------------------------------------------------------------------------------------------------------------------
async function regenerateSlugFromTitle({ setSlug, suggestSlug, title }: RegenerateSlugFromTitleOpts) {
  const slug = await suggestSlug(title);
  setSlug(slug);
  return slug;
}
type RegenerateSlugFromTitleOpts = { setSlug: (slug: string) => void; suggestSlug: (title: string) => Promise<string>; title: string };

async function uploadFile(file: File, generateUploadUrl: () => Promise<string>) {
  const uploadUrl = await generateUploadUrl();
  const response = await fetch(uploadUrl, { body: file, headers: { "Content-Type": file.type }, method: "POST" });
  if (!response.ok) throw new Error("Upload failed");
  const payload: { storageId: Id<"_storage"> } = await response.json();
  return payload.storageId;
}
