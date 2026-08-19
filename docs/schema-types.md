# Schema and type architecture

Read this document before changing `@ec/domain` schemas, backend DTO projections, Entity hydration, or frontend form schemas. Effect Schema is the canonical first-party schema system. During migration, Zod schemas remain authoritative only for areas not yet migrated. Derive TypeScript types from their schema values instead of duplicating them manually.

Schema values are named by implementation:

- Effect Schema values use an `s` prefix: `sProfileFields`, `sTravelPackDto`, `sCanonicalEmail`.
- Zod schema values use the existing `z` prefix: `zTravelPackFields`, `zCanonicalEmail`.

The prefix applies to runtime schema values, not derived TypeScript types or domain namespaces. Do not use bare names such as `ProfileFields` for Effect Schema values.

In first-party Effect code, import the primary namespaces as `E`, `S`, and `L`:

```ts
import { Effect as E, Layer as L, Schema as S } from "effect";
```

Use `E.fn` for functions whose boundary directly returns a generator-based Effect. Keep `E.gen` for effect values, inline programs, and cases where wrapping a callback in `E.fn` would obscure an external API boundary. Prefer Effect Schema field composition such as `S.fieldsAssign` and `mapFields` over spreading or reconstructing `.fields`. Use Confect's public `GenericId.GenericId(tableName)` for Convex ID schemas; reserve `SystemFields.SystemFields(tableName)` for complete raw Doc system fields.

## Canonical representations

Group related derived types under their feature namespace and expose only representations that genuinely exist:

```ts
export type TravelPacks = {
  Create: typeof sTravelPackCreate.Type;
  Doc: typeof sTravelPackDoc.Type;
  Dto: typeof sTravelPackDto.Type;
  Entity: typeof sTravelPack.Type;
  Fields: typeof sTravelPackFields.Type;
  Status: typeof sTravelPackStatus.Type;
};
```

For an Effect Schema feature, use the same namespace shape with schema-derived `Type` values:

```ts
export type Profiles = {
  Doc: typeof sProfileDoc.Type;
  Entity: typeof sProfile.Type;
  Fields: typeof sProfileFields.Type;
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

Application/domain code does not adopt Confect's decoded-Doc terminology. An Effect transform that produces `Date`, `Option`, nested Entities, or another hydrated value belongs at the appropriate `Dto → Entity` boundary. Persisted `Doc` remains the raw Convex-compatible representation.

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

Shared domain schemas may expose stable validation error identifiers when application code needs to distinguish validation failures independently from presentation copy. Validation identifiers belong to the domain and must never contain localized or user-facing text.

Define one canonical error vocabulary per feature instead of repeating literal strings across schemas, business logic, Convex functions, or frontend code:

```ts
export const TRAVEL_PACK_ERROR = {
  coverInvalid: "TRAVEL_PACK_COVER_INVALID",
  pdfInvalid: "TRAVEL_PACK_PDF_INVALID",
  slugInvalid: "TRAVEL_PACK_SLUG_INVALID",
  slugRequired: "TRAVEL_PACK_SLUG_REQUIRED",
  titleRequired: "TRAVEL_PACK_TITLE_REQUIRED",
} as const;

export const sTravelPackTitle = Schema.Trim.check(Schema.isMinLength(1, { message: TRAVEL_PACK_ERROR.titleRequired }));
```

If runtime validation of an error identifier is useful, derive a Zod schema from the same canonical vocabulary rather than maintaining a second list:

```ts
export const sTravelPackError = Schema.Literals(Object.values(TRAVEL_PACK_ERROR));
export type TravelPackError = typeof sTravelPackError.Type;
```

Do not create operation-specific error arrays or schemas merely to document which exceptions a function may throw. Ordinary TypeScript `throw` is not typed, so such declarations can silently drift from the implementation. Introduce narrower error schemas only when they validate a genuine runtime boundary.

Not every Zod issue needs a custom domain identifier. Use a stable identifier when the application needs specific copy, the failure crosses package boundaries, multiple consumers need to recognize it, or it represents a meaningful domain/application condition. Generic Zod issues may remain generic when no application-specific distinction is required.

### Application localization

Domain error identifiers remain independent from translated application copy. A frontend feature owns the mapping from its domain validation identifiers to Paraglide message functions in `features/<feature>/validation.ts`:

```ts
import { TRAVEL_PACK_ERROR } from "@ec/domain/schemas/travel-packs";

import * as m from "@/paraglide/messages";

export const TRAVEL_PACK_VALIDATION_MESSAGES = {
  [TRAVEL_PACK_ERROR.slugInvalid]: m.some_slug_invalid_message,
  [TRAVEL_PACK_ERROR.slugRequired]: m.some_slug_required_message,
  [TRAVEL_PACK_ERROR.titleRequired]: m.some_title_required_message,
} as const;
```

The application form layer resolves validation identifiers before rendering field errors:

```text
domain error identifier
        ↓
domain / feature schema
        ↓
Standard Schema issue
        ↓
TanStack Form
        ↓
application validation resolver
        ↓
Paraglide message
        ↓
FieldError
```

The dependency direction remains:

```text
frontend → @ec/domain
frontend → Paraglide
```

Never put Paraglide imports or localized copy in `@ec/domain`, duplicate domain error identifiers in frontend schemas, use Paraglide message IDs as domain error identifiers, or render raw identifiers such as `TRAVEL_PACK_TITLE_REQUIRED` directly to users.

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

Frontend-only schemas must not embed Paraglide copy in validation issues. Reuse canonical domain identifiers where the constraint is domain-owned; when a validation exists only for a browser/form representation, define an application validation identifier and map it to Paraglide copy through the same feature `validation.ts` boundary. Prefer reusing canonical field schemas without duplicating constraints. Pass Effect schemas to TanStack Form through `Schema.toStandardSchemaV1(...)`.

When a frontend form schema transforms browser input into a domain representation, such as `""` to `null`, submission must use the parsed schema output before crossing the backend boundary. TanStack Form validation does not imply that the stored form value has been replaced by the schema's transformed output.

## Validation infrastructure

`@ec/validation` owns genuinely generic validation infrastructure. During migration it still contains shared Zod configuration for unmigrated features; generic Effect Schema infrastructure may replace that configuration when the broader migration reaches it. The package is not a bucket for feature form schemas and does not establish a centralized cross-application forms layer.

```text
@ec/domain     → canonical business/data/application schemas
@ec/validation → generic validation infrastructure
frontend       → UI/form-specific schemas and localized validation presentation
```
