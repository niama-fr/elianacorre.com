# Schema and type architecture

Read this document before changing `@ec/domain` schemas, backend DTO projections, Entity hydration, or frontend form schemas. Zod schemas are the source of truth; derive TypeScript types with `z.infer` or `z.input` instead of duplicating them manually.

## Canonical representations

Group related derived types under their feature namespace and expose only representations that genuinely exist:

```ts
export type TravelPacks = {
  Create: z.infer<typeof zTravelPackCreate>;
  Doc: z.infer<typeof zTravelPackDoc>;
  Dto: z.infer<typeof zTravelPackDto>;
  Entity: z.infer<typeof zTravelPack>;
  Fields: z.infer<typeof zTravelPackFields>;
  Status: z.infer<typeof zTravelPackStatus>;
};
```

The canonical pipeline is:

```text
Convex persistence
      ↓
Fields — application-owned persisted fields, excluding _id and _creationTime
      ↓
Doc — complete Convex document, including system fields
      ↓ fooDtoFrom(...)
Dto — serialized or enriched application transport contract
      ↓ fooFrom(...)
Entity — canonical hydrated application representation
```

`Dto` may omit persistence-only fields, expand references, add computed data, or use explicit transport representations. Relationship enrichment belongs in the backend DTO projection; provider-owned Stripe, Mux, Better Auth, Loops, or Convex objects remain behind adapters unless explicitly approved as application contracts.

`Entity` is application data, not a frontend view model. It may hydrate DTO strings into `Date` values or nested DTOs into nested Entities. User-facing formatting belongs to frontend `DISPLAY`:

```text
Doc → Dto → Entity → DISPLAY → JSX
DB     wire    app       UI
```

Use the correct date representation at each boundary. Keep Convex-compatible values in `Doc`, explicit serialized values in `Dto`, richer values such as `Date` in `Entity`, and localized strings in `DISPLAY`.

Not every feature needs every representation. A DTO schema may be a legitimate shared domain contract even when it is not persisted. When DTO and Entity are identical, alias their schemas (`zEbook = zEbookDto`) without adding an identity runtime transform. Do not create DTOs or hydration functions solely for naming symmetry.

## Naming and migration

Use `fooDtoFrom(...)` for a function producing a DTO, even when enrichment requires additional inputs:

```ts
function travelPackDtoFrom(doc: TravelPacks["Doc"]): TravelPacks["Dto"] {
  // projection and enrichment
}
```

Use `fooFrom(...)` for the canonical DTO-to-Entity hydration transform:

```ts
function travelPackFrom(dto: TravelPacks["Dto"]): TravelPacks["Entity"] {
  // hydration
}
```

`Dto` replaces the project-specific `Entry` name for application transport representations. New and meaningfully modified code uses `Dto`; existing `Entry` features migrate opportunistically rather than through a repository-wide rename. Do not introduce `View`, `ViewModel`, or `DisplayEntity` as synonyms for `Entity` or frontend `DISPLAY`.

## Domain schema ownership

`@ec/domain` owns canonical business, persistence, and application contracts: field primitives, `Fields`, `Doc`, operation payloads, `Dto`, `Entity`, statuses, and authoritative storage metadata. Centralize these schemas by feature under `packages/domain/src/schemas`.

Compose schemas from canonical definitions with `.pick()`, `.omit()`, `.extend()`, or shape composition. Prefer explicit patch contracts when `.partial()` would weaken business semantics.

Storage content type, size, checksum, storage IDs, and accepted canonical MIME types remain domain-owned because backend code validates them at the authoritative Convex boundary. Browser file checks serve a different UX boundary. Original uploaded filenames remain application metadata; Convex `_storage` does not provide that domain filename. Do not duplicate authoritative `_storage` size/content type on an aggregate without a separate business reason.

Use Convex `_creationTime` unless a distinct business creation timestamp exists. Keep explicit `updatedAt` where last-update semantics are required.

## Validation and localization

Shared domain schemas express semantic constraints without localized UI copy or Paraglide imports:

```ts
export const zTravelPackTitle = z.string().trim().min(1);
```

Generic Zod issues (`too_small`, `too_big`, `invalid_type`, `invalid_format`) carry ordinary validation meaning. Use stable semantic codes such as `slug_duplicate` or `travel_pack_not_publishable` only when a business failure cannot be inferred from those issues. Frontends map issues and business codes to Paraglide copy.

The dependency direction is:

```text
frontend → @ec/domain
frontend → Paraglide
```

`@ec/domain` remains reusable by backend, frontend, tests, and other applications without depending on a UI locale.

## Frontend form schemas

Frontend features own schemas whose shape exists because of browser or editing behavior: `File`, temporary empty strings, UI-only or confirmation fields, formatted inputs, partially typed URLs, form-specific null/default semantics, and editing-only cross-field validation.

Reuse a domain schema directly when its representation is identical. Create a form schema only for a real representation difference, and derive its `Values` and `DefaultValues` types beside that frontend schema. These form-specific types do not belong in a domain feature namespace.

```text
browser File
    ↓ upload
storageId + original fileName
    ↓
domain/backend Create contract
```

A frontend-only schema may use Paraglide for user-facing validation messages. Prefer reusing canonical field schemas and translating structured issues when that preserves behavior without duplicating constraints.

## Validation infrastructure

`@ec/validation` owns shared Zod configuration and genuinely generic validation utilities. It is not a bucket for feature form schemas and does not establish a centralized cross-application forms layer.

```text
@ec/domain     → canonical business/data/application schemas
@ec/validation → generic Zod/validation infrastructure
frontend       → UI/form-specific schemas and localized validation presentation
```
