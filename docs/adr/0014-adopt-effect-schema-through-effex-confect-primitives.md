# Adopt Effect Schema through effex and public Confect primitives

## Status

Accepted. The Profiles architecture gate was approved under [NIA-74](https://linear.app/niama/issue/NIA-74/adopt-effect-4-through-a-reusable-effexconfect-foundation) on 2026-08-18.

## Decision

Use Effect 4 and Effect Schema as the canonical first-party runtime and schema system, integrated with Convex through the private reusable `@niama/effex` package and public Confect v10 primitives. Confect continues to own Effect Schema-to-Convex compilation, FunctionSpec/Ref codecs, typed error transport, and Effect handler execution. effex owns only the reusable semantic differences required to retain native Convex authoring: optional lookups, `query(...).withIndex(...)`, native patch, raw escape hatches, synchronized native-registration/typed-Ref descriptors, and a small cache-safe query Clock because Confect's equivalent is not publicly exported.

The complete Confect Spec/Impl/codegen architecture is rejected for this incremental migration because it assumes ownership of the application schema and generated Convex directory. That conflicts with the remaining Zod tables and the native Convex component/provider integration functions that must continue to coexist during migration. effex must use only public Confect APIs and must not be redesigned unless implementation reveals a concrete blocker.

Expected database absence is represented inside Effect code with `Option`: effex converts native Convex `null` from `db.get`, query `first`, and query `unique` into `None`, and successful documents into `Some`. Native `unique` invariant failures still fail rather than becoming absence. Public Convex contracts continue to use their intended Convex-compatible representation rather than exposing Effect `Option`.

effex preserves Convex's query type states: `QueryInitializer` selects a full scan, database index, or search index; `Query` may be ordered once; and `OrderedQuery` exposes filters and terminal operations without another `order`. Its synchronous `normalizeId` converts native `null` to `Option`. Writes use current table-name overloads, and patch input is the Type of the table's explicit Patch schema rather than a blanket `Partial<Fields>`.

Every `database(...)` registry statically binds its key to the Confect table's `tableName` and the Convex DataModel table name. Each database instance owns runtime-distinct Reader and Writer Context identities. A mutation writer layer provides both services because Convex writers are also readers. Public function registration accepts only a matching public query or mutation Confect spec, and layer construction failures must belong to the spec's declared typed error channel.

Application schemas retain application representation terminology: `Fields` are persisted application-owned Convex-compatible fields, `Doc` is the raw complete Convex-compatible document, `Dto` is the serialized or enriched transport contract, and `Entity` is the hydrated application representation. Confect's decoded-Doc terminology does not enter domain code. Effect Schema values use an `s` prefix; Zod schema values keep the existing `z` prefix.
