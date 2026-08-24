# Frontend implementation

This document is authoritative for all future frontend implementation unless an explicit task overrides it. The repository uses React; use React APIs and adapters throughout. Existing code may be aligned incrementally, so feature work does not imply a repository-wide refactor.

## File structure

After imports, use the following 140-character concern separators in canonical order. Include only sections the file needs; never create empty sections:

```ts
// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
// DISPLAY ---------------------------------------------------------------------------------------------------------------------------------
// STYLES ----------------------------------------------------------------------------------------------------------------------------------
// PAGE ------------------------------------------------------------------------------------------------------------------------------------
// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------
// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
// TYPES -----------------------------------------------------------------------------------------------------------------------------------
```

`PAGE`, `LAYOUT`, and `COMPONENT` are contextual alternatives for the file's main rendered unit. The usual shapes are:

```text
Route/page:          CONSTS, ROUTE, DISPLAY, STYLES, PAGE, COMPONENTS, HELPERS, TYPES
Layout:              CONSTS, DISPLAY, STYLES, LAYOUT, COMPONENTS, HELPERS, TYPES
Standalone component: CONSTS, DISPLAY, STYLES, COMPONENT, COMPONENTS, HELPERS, TYPES
```

Use these exact names. The canonical aliases are `CONSTS`, `HELPERS`, and `DISPLAY`, rather than `CONSTANTS`, `UTILS`, `UTILITIES`, `FUNCTIONS`, or `PRESENTATION`.

### CONSTS

`CONSTS` appears immediately after imports when the file has static local values: numbers, strings, limits, debounce durations, immutable arrays, static configuration, and other non-display constants.

```ts
// CONSTS ----------------------------------------------------------------------------------------------------------------------------------

const MAX_TITLE_LENGTH = 120;
const SEARCH_DEBOUNCE_MS = 300;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"] as const;
```

Domain-to-user mappings belong in `DISPLAY`; CVA objects belong in `STYLES`.

### ROUTE

`ROUTE` follows `CONSTS` and owns TanStack Router or TanStack Start configuration: the route declaration, search validation, loaders, `beforeLoad`, route context, and route-level metadata. Keep route configuration separate from `PAGE`.

### DISPLAY

`DISPLAY` contains frontend-only mappings, icons, formatters, and option definitions whose purpose is to represent application or domain values to the user. It precedes rendering because these non-hoisted values are consumed by the implementation.

```ts
const statusDisplay = {
  archived: m.third_message,
  draft: m.some_message,
  published: m.another_message,
} satisfies Record<TravelPackStatus, () => string>;
```

Keep business rules, persistence, Tailwind classes, CVA definitions, and literal translated strings outside `DISPLAY`.

### STYLES

`STYLES` contains the uppercase CVA style object named after the file's main page, layout, or component. It precedes rendering because it is a non-hoisted value used there.

```ts
// STYLES ----------------------------------------------------------------------------------------------------------------------------------

const TRAVEL_PACK_PAGE = {
  root: cva("..."),
  status: cva("..."),
};
```

Keep styles separate from `DISPLAY`, and continue to expose existing state through meaningful `data-*` attributes instead of mirroring that state with CVA variants.

### Main rendering section

The main rendered unit follows `STYLES`. Use exactly one section matching the file's purpose:

```tsx
// PAGE ------------------------------------------------------------------------------------------------------------------------------------

function TravelPackPage() {
  return <main />;
}
```

```tsx
// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------

export function AdminLayout(props: AdminLayoutProps) {
  return <div>{props.children}</div>;
}
type AdminLayoutProps = { children: ReactNode };
```

```tsx
// COMPONENT -------------------------------------------------------------------------------------------------------------------------------

export function MarkdownField(props: MarkdownFieldProps) {
  return <textarea value={props.value} readOnly />;
}
type MarkdownFieldProps = { value: string };
```

### Props colocation

The props type for a page, layout, main component, or child component belongs immediately after the function it describes, with no blank line between the closing brace and the type. Props types never move to the final `TYPES` section.

```tsx
export function MyComponent(props: MyComponentProps) {
  return <div>{props.children}</div>;
}
type MyComponentProps = { children: ReactNode };
```

### COMPONENTS

`COMPONENTS` follows the main `PAGE`, `LAYOUT`, or `COMPONENT`. It contains subordinate React components used by the main unit or other local components. Use function declarations so these intentionally trailing components remain hoisted and readable below their consumer. Attach each props type directly to its component.

```tsx
// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------

function TravelPackRow(props: TravelPackRowProps) {
  return <li>{props.title}</li>;
}
type TravelPackRowProps = { title: string };
```

This order makes the file read from its main purpose into local React implementation details. Do not move `COMPONENTS` before the main unit merely to create cosmetic declaration order.

### HELPERS

`HELPERS` follows `COMPONENTS` and contains named file-local functions that are not React components: formatters, predicates, transformations, mappers, factories, and other local utility logic. Prefer function declarations so helpers can remain below consumers while satisfying the configured lint treatment for functions.

```ts
// HELPERS ---------------------------------------------------------------------------------------------------------------------------------

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}
```

Keep React components in `COMPONENTS`; do not introduce competing `UTILS` or `FUNCTIONS` sections.

### TYPES

`TYPES` is the final section, and nothing follows it. It contains file-local types other than component, page, or layout props.

```ts
// TYPES -----------------------------------------------------------------------------------------------------------------------------------

type SortDirection = "asc" | "desc";
type TravelPackTableState = { direction: SortDirection; search: string };
```

Omit `TYPES` when no applicable types exist.

### Ordering rationale and lint

Non-hoisted static dependencies appear before rendering:

```text
CONSTS → ROUTE → DISPLAY → STYLES
```

Hoisted implementation details intentionally appear after the main rendering unit:

```text
COMPONENTS → HELPERS
```

Prefer function declarations for those trailing details. This produces the reading flow `configuration → main rendering unit → local React details → local helper logic → supporting types` without broad `no-use-before-define` suppressions.

`oxlint-disable` directives are exceptional escape hatches, not part of standard frontend structure. The section convention must not systematically require disabling `eslint/no-use-before-define`; reorder declarations instead.

### Complete example

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { cva } from "class-variance-authority";

import * as m from "@/paraglide/messages";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------

const MAX_ITEMS = 20;

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------

export const Route = createFileRoute("/admin/resources")({ component: ResourcesPage });

// DISPLAY ---------------------------------------------------------------------------------------------------------------------------------

const statusDisplay = {
  archived: m.third_message,
  draft: m.some_message,
  published: m.another_message,
} satisfies Record<ResourceStatus, () => string>;

// STYLES ----------------------------------------------------------------------------------------------------------------------------------

const RESOURCES_PAGE = {
  root: cva("..."),
  status: cva("..."),
};

// PAGE ------------------------------------------------------------------------------------------------------------------------------------

function ResourcesPage(props: ResourcesPageProps) {
  return (
    <main className={RESOURCES_PAGE.root()}>
      <ResourceList resources={props.resources.slice(0, MAX_ITEMS)} />
    </main>
  );
}
type ResourcesPageProps = { resources: Resource[] };

// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------

function ResourceList(props: ResourceListProps) {
  return (
    <ul>
      {props.resources.map((resource) => (
        <li key={resource.id}>{statusDisplay[resource.status]()}</li>
      ))}
    </ul>
  );
}
type ResourceListProps = { resources: Resource[] };

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------

function formatUpdatedAt(value: number) {
  return new Intl.DateTimeFormat("fr-FR").format(value);
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------

type ResourceStatus = "draft" | "published" | "archived";
type Resource = { id: string; status: ResourceStatus; updatedAt: number };
```

The example demonstrates file topology only; feature-specific domain behavior remains with its owning feature.

## Responsibility model

| Concern                                  | Owner                                            |
| ---------------------------------------- | ------------------------------------------------ |
| Stable application/domain values         | Canonical English values in the domain model     |
| Intentional user-facing application copy | Paraglide messages                               |
| Domain value representation              | `DISPLAY`                                        |
| Component visuals                        | `STYLES` and CVA                                 |
| Existing state exposed for styling       | Semantic `data-*` attributes                     |
| Forms                                    | App-local TanStack Form integration (`src/form`) |
| Operational data tables                  | TanStack Table                                   |
| Navigation and active state              | TanStack Router                                  |
| Reusable controls and field behavior     | Generic, domain-independent `@ec/ui` primitives  |

JSX primarily expresses semantic structure, composition, data flow, interaction, accessibility, and meaningful state. Keep repeated copy, domain-display decisions, and component-owned Tailwind classes at their respective boundaries. Editorial content such as a Travel Pack title, excerpt, or description remains application data rather than interface copy.

Use TanStack Router links and match data for navigation, breadcrumbs, and active state. Preserve link semantics for keyboard use and opening in a new tab. Expose router-derived state with `data-active`; avoid pathname parsing and duplicated prefix matching.

## Component ownership

The frontend is feature-oriented: generic UI primitives are separate from business-aware feature components. Place a component at the narrowest ownership level that matches its real consumers.

```text
@ec/ui
    ↓ cross-application, domain-agnostic primitives

apps/<app>/src/form
    ↓ application-specific TanStack Form integration

features/<domain>/components
    ↓ reusable features/domain UI

PAGE / LAYOUT / COMPONENT
    ↓ screen or resource implementation

COMPONENTS
    ↓ file-local implementation details
```

### Level 1 — file-local components

Keep a component in the trailing `COMPONENTS` section when it has one consumer, primarily makes its parent readable, and does not represent a reusable business concept. Do not create a separate file for a trivial one-consumer component merely for organizational symmetry.

```tsx
// COMPONENTS ------------------------------------------------------------------------------------------------------------------------------

function TravelPackTableRow(props: TravelPackTableRowProps) {
  return <tr>{props.children}</tr>;
}
type TravelPackTableRowProps = { children: ReactNode };
```

### Level 2 — feature/domain components

Reusable components that understand application terminology, domain enums, domain workflows, feature routes, or feature-specific behavior belong to their owning feature, under a structure such as `features/<domain>/components`. They may import that feature's domain types and use Paraglide messages directly for feature copy.

Name domain-aware components with their owner: `TravelPackStatusBadge`, `TravelPackCreateDialog`, and `TravelPackPublicationState` are preferable to ambiguous names such as `StatusBadge` or `CreateDialog`.

A feature component follows the canonical file structure: optional `CONSTS`, `DISPLAY`, and `STYLES`; the main `COMPONENT`; optional trailing `COMPONENTS` and `HELPERS`; then optional final `TYPES`. Keep its props type immediately after its function.

### Level 3 — generic `@ec/ui` primitives

`@ec/ui` owns reusable cross-application, domain-agnostic primitives such as `Badge`, `Button`, `Dialog`, `Drawer`, `Sheet`, table primitives, `Input`, `Textarea`, `Field`, `Tooltip`, and `Breadcrumb`. These components may own generic interaction, accessibility, visual state, semantic data attributes, and reusable styling.

Application-specific TanStack Form contexts, hooks, registered fields, submit controls, and validation resolution do **not** belong in `@ec/ui`. They live in the consuming application's `src/form` directory and compose `@ec/ui` primitives. A controlled editor primitive may be promoted to `@ec/ui` when it is genuinely reused across applications; a TanStack Form-aware field adapter remains app-local.

Application terminology, domain enum values, business workflows, feature routes, and feature-specific messages stay outside `@ec/ui`. For example, `Badge` belongs in `@ec/ui`; the mapping from `TravelPackStatus` to a translated label rendered inside that badge belongs in the Travel Pack feature.

### Level 4 — shared domain UI

Start domain-aware UI inside its feature. Promote it to a shared domain package only after a second genuine application or package consumer makes feature-local ownership inadequate. Hypothetical reuse is not an extraction criterion, and the repository does not create shared domain UI packages preemptively.

### Decision tree

```text
Used only in this file?
→ Keep it under COMPONENTS.

Reusable and understands one features/domain feature?
→ Place it under features/<domain>/components.

Reusable across applications and completely domain-agnostic?
→ Place it in @ec/ui.

Application-wide TanStack Form integration?
→ Place it in that application's `src/form`.

The same domain-aware component is genuinely shared across application/package boundaries?
→ Consider promotion to a shared domain package.
```

Avoid a generic global `components/` directory for arbitrary business components. Once a reusable domain component exists, use it wherever the same semantic rendering is intended rather than duplicating its domain-to-display mapping. Keep `DISPLAY` and `STYLES` separate inside that component: domain value to user meaning belongs in `DISPLAY`, while the canonical value exposed through attributes such as `data-status` drives `STYLES`.

## Application copy with Paraglide

French is currently the sole base locale. Source messages live in the canonical flat catalog at `apps/app/messages/fr.json`; generated modules live in `apps/app/src/paraglide` and are compiler-owned. Import and use generated message functions directly from `@/paraglide/messages.js`. Do not add a `copy.ts` wrapper, another translation abstraction, or hand-edit generated output.

The Vite plugin recompiles messages during development and builds. Tests and type checks run `bun run paraglide:compile` first so a clean checkout is reproducible. To regenerate manually, run `bun run paraglide:compile` from `apps/app`. Adding future locales requires an explicit product decision about locale selection and routing; the current `baseLocale` strategy preserves all existing URLs.

The prerequisites are Bun, installed workspace dependencies, and access to the pinned Inlang plugins during a cold compile. Compilation reads only repository message files and emits ignored generated code; it uses no application credentials or user data. If generation fails, restore the message/config changes or fix the reported catalog error, then rerun the compile command. Review generated imports through type checking rather than editing output. Keep the pinned plugins and this workflow aligned when upgrading Paraglide.

### Message storage

Use the native Inlang Message Format and one flat locale catalog. A large central catalog is acceptable and expected: Paraglide compiles and tree-shakes message functions individually, so runtime-style namespaces and feature-local locale files do not improve bundle splitting. Source-code usage is the locality boundary; Sherlock provides inline translated values and navigation without requiring developers to browse the catalog as their normal workflow. Editorial and database content never belongs in Paraglide.

### Message IDs and reuse

Message IDs are stable identities rather than descriptions of wording, hierarchy, or current component location. Use the human-readable random IDs generated by Sherlock extraction. Keep IDs flat, do not encode semantic hierarchy, and do not rename an established ID merely because its text changes or its usage moves.

Identical current text does not imply shared identity. Give independent UI messages distinct IDs when their wording may evolve independently. Reuse an ID only when usages intentionally represent the same product message and should change together.

### Sherlock workflow

Install the repository-recommended Sherlock extension. Its configured `m`-function matcher shows French values inline for generated calls such as `m.calm_green_otter()`, supports hover/navigation, and extracts selected hardcoded UI text into a new message with a generated human-readable ID. Use Sherlock's extract action when adding interface copy, accept its generated ID, and then use the generated Paraglide function directly. Do not manually design semantic IDs or browse `messages/fr.json` as the ordinary authoring workflow.

## DISPLAY

`DISPLAY` answers how an application/domain value is represented to a user. It may contain Paraglide message functions, icons, formatters, and display-only options. It contains no business or persistence rules, raw Tailwind classes, CVA definitions, or duplicated translated strings.

`Entity` and `DISPLAY` are separate concepts: an Entity is the hydrated application representation, while `DISPLAY` maps its values to user-facing labels, icons, and localized formatting. Keep the flow `Dto → Entity → DISPLAY → JSX`; DTO projection and Entity hydration never belong in `DISPLAY`. The canonical frontend term remains `DISPLAY`, not `VIEW`.

Use exhaustive typed mappings for finite unions so a new domain value produces a TypeScript error until its display is handled:

```ts
const statusDisplay = {
  archived: { label: m.proud_years_think },
  draft: { label: m.metal_garlics_retire },
  published: { label: m.gold_flies_send },
} satisfies Record<TravelPackStatus, { label: () => string }>;
```

Use concise names such as `statusDisplay`, `typeDisplay`, and `stateDisplay`. The canonical term is `DISPLAY`, not `presentation`.

## STYLES and state

Continue the repository CVA approach. A frontend file defines an uppercase style object named for its main page, layout, or component, such as `TRAVEL_PACK_PAGE` or `MARKDOWN_FIELD`. Put component-owned classes there instead of repeating raw Tailwind strings in JSX.

When application/component state already exists, expose it with a semantic attribute such as `data-status`, `data-state`, `data-active`, `data-invalid`, `data-selected`, or `data-orientation`, and select it in the CVA definition. Use canonical English domain values in attributes. CVA variants remain appropriate for genuine reusable visual APIs such as size, density, or emphasis; avoid variants that merely mirror existing state.

Keep meaning and visuals separate: a status `DISPLAY` mapping owns its translated label, while `data-status="draft"` lets `STYLES` own its warning treatment. Generic `@ec/ui` primitives do not know Travel Pack terminology.

## Forms and reusable controls

Use TanStack Form for application forms. Each application owns its TanStack Form integration under `apps/<app>/src/form`: form/context hooks, registered field adapters, submit controls, application validation resolution, and other cross-feature form behavior belong there rather than in `@ec/ui`.

`@ec/ui` remains the home of reusable cross-application presentation and interaction primitives. App-local form fields compose those primitives. Feature-specific forms and schemas remain with their feature.

```text
@ec/ui
→ generic Input / Textarea / Field / Button / editor primitives

apps/<app>/src/form
→ TanStack Form contexts, hooks, registered fields, FieldError resolution

features/<feature>
→ feature form schemas, validation mappings, domain-specific form behavior
```

Prefer an existing shadcn/Base UI primitive from `@ec/ui` before adding feature-local control behavior. Extract a new `@ec/ui` control only when its API is domain-agnostic and it has genuine cross-application reuse or clear primitive-level ownership; do not move app-specific form adapters into the shared package merely for symmetry.

Markdown editing uses the native-textarea editing model and `@tanstack/markdown` for preview rendering. Form state and persistence always hold raw Markdown; generated HTML is presentation output only. A TanStack Form-aware Markdown field belongs in the application's form layer unless a lower-level controlled editor is genuinely shared.

Reusable semantic and domain schemas belong in `@ec/domain`; the complete ownership and representation convention lives in [`schema-types.md`](schema-types.md). A frontend feature owns the raw Effect Schema for each TanStack form, even when its object shape currently matches a backend request. Compose its fields from domain-owned semantic schemas instead of importing a Confect spec or moving the whole form struct into the domain package. Derive form values and default-value types beside that frontend schema. Name actual form schemas `sFooForm`. Convert Effect Schema to Standard Schema only at the form, router, or server-function consumer that requires it.

### Form validation messages

Application forms may consume domain validation identifiers, but they must never render those identifiers directly.

Feature directories own the mapping from their domain validation identifiers to Paraglide message functions in `features/<feature>/validation.ts`. The application-wide form layer resolves those identifiers when rendering `FieldError`.

```text
@ec/domain
→ validation identifiers and canonical schemas

features/<feature>/validation.ts
→ identifier → Paraglide message mapping

apps/<app>/src/form
→ application-wide validation resolution and field rendering

Paraglide
→ user-facing copy
```

Domain validation identifiers are stable programmatic values, not user-facing strings. Paraglide owns the localized copy. Do not import Paraglide from `@ec/domain`, duplicate validation identifiers in feature schemas, use message IDs as domain error codes, or let a raw identifier fall through to `FieldError`.

When a frontend form schema intentionally transforms its browser representation into a domain representation—for example `""` to `null` for an optional URL—submission must use the parsed output before crossing the backend boundary. Field validation alone does not imply that TanStack Form has replaced its stored value with the schema's transformed output.

## Operational tables

Use TanStack Table as the headless state/model engine for structured resource lists when sorting, filtering, searching, pagination, column visibility, row selection, reusable columns, or alternate responsive rendering is meaningful or likely to become meaningful. Keep table rendering under `@ec/ui` and CVA rather than letting the state engine dictate visual design.

Use ordinary semantic lists or cards for tiny static lists and visual collections without tabular behavior. The decision boundary is operational data: prefer TanStack Table when hand-built transformations or table state would otherwise accumulate. Start with only the behavior the current resource needs; add pagination, selection, filtering, and column controls when product behavior requires them.
