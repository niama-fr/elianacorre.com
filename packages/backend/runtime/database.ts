import { Table } from "@confect/server";
import { sIdentityFields } from "@ec/domain/schemas/identities";
import { sProfileFields, sProfilePatch } from "@ec/domain/schemas/profiles";
import { sTravelPackFields, sTravelPackPatch } from "@ec/domain/schemas/travel-packs";
import { database, table } from "@niama/effex";
import { Schema as S, Struct } from "effect";

import type { DataModel } from "../convex/_generated/dataModel";

export const ProfilesTable = table(
  "profiles",
  () =>
    Table.make(() => sProfileFields)
      .index("by_email", ["email"])
      .index("by_role", ["role"]),
  () => sProfilePatch
);

export const IdentitiesTable = table(
  "identities",
  () =>
    Table.make(() => sIdentityFields)
      .index("by_profile_id_and_adapter", ["profileId", "adapter"])
      .index("by_adapter_and_adapter_id", ["adapter", "adapterId"]),
  () => sIdentityFields.mapFields(Struct.map(S.optionalKey))
);

export const TravelPacksTable = table(
  "travelPacks",
  () =>
    Table.make(() => sTravelPackFields)
      .index("by_cover_storage_id", ["coverStorageId"])
      .index("by_pdf_storage_id", ["pdfStorageId"])
      .index("by_slug", ["slug"])
      .index("by_updated_at", ["updatedAt"]),
  () => sTravelPackPatch
);

export const tables = { identities: IdentitiesTable, profiles: ProfilesTable, travelPacks: TravelPacksTable };
export const db = database<DataModel, typeof tables>(tables);

export const queryLayer = (ctx: Parameters<typeof db.readerLayer>[0]) => db.readerLayer(ctx);
export const mutationLayer = (ctx: Parameters<typeof db.writerLayer>[0]) => db.writerLayer(ctx);
