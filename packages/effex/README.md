# effex

`@niama/effex` is a private, reusable Effect 4 compatibility layer for authoring native-style Convex functions with supported Confect v10 primitives.

The package deliberately does not own application services or import any `@ec/*` application package. Applications provide their own Effect layers and retain access to the raw Convex reader or writer.

## Architecture gate

The Profiles tracer selects the lighter Confect-primitives integration rather than Confect's complete Spec/Impl code-generation pipeline. Complete Confect generation owns the application schema and generated Convex directory, which cannot coexist cleanly with an incremental migration that still contains native component/provider functions and Zod-backed tables.

The selected seam reuses these public Confect APIs:

- `Table.make` and `Table.tableDefinition` for Effect Schema to Convex tables;
- `SchemaToValidator` for function validators;
- `FunctionSpec` and `Ref` for contracts and typed clients;
- `RegisteredFunction.runHandlerPromise` for Effect execution and declared error transport.

effex adds only the semantic differences required by native Effect application code:

- native `QueryInitializer → Query → OrderedQuery` state transitions, including index and search-index queries;
- `Option` for expected absence from `get`, `first`, and `unique`, while retaining native multiple-match `unique` failure;
- synchronous `normalizeId(tableName, value): Option<GenericId<TableName>>`;
- a real `db.patch` that encodes the supplied patch and calls Convex `patch` without a read/replace cycle;
- patch inputs derived from each table's explicit `Patch` schema;
- raw reader/writer escape hatches;
- per-database Reader/Writer Context identities, with mutation layers providing both capabilities;
- one function descriptor that owns the Confect spec/ref and native Convex registration;
- a cache-safe query Clock matching Confect's policy, because that machinery is not publicly exported by Confect;
- concise native Convex query/mutation registration with application-owned Effect layers.

The public package interface is deliberately limited to `table`, `database`, and `functionModule`.

`functionModule` binds the Convex module namespace once and returns query or mutation descriptors whose single Confect `FunctionSpec` produces both the typed `Ref` and the native registration function. Without Confect codegen, the descriptor's function name must still match the JavaScript export name required by Convex; the Profiles end-to-end Ref tests guard that unavoidable correspondence.

`database` accepts a registry whose key must equal both the bound Confect table's `tableName` and a table in the supplied Convex `DataModel`. Each call creates runtime-distinct Effect Context services. A reader layer provides Reader; a writer layer provides both Writer and Reader because a Convex mutation database supports both capabilities.

Function registration accepts only public Confect query specs through `.query` and public Confect mutation specs through `.mutation`. Layer failures are constrained to the spec's declared error channel; a function without a declared error can therefore use only layers whose construction cannot fail with a typed error.

No private Confect API is part of this boundary.
