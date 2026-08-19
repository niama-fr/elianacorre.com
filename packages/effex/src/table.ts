/* oxlint-disable typescript/no-explicit-any, typescript/no-unnecessary-type-parameters -- Confect exposes schema/table existential types through `any`; this file is the checked interop boundary. */
import type { Table } from "@confect/server";
import type { Schema as S } from "effect";

export type EffexTable = {
  readonly Patch: S.Codec<any, any>;
} & Table.AnyWithProps;

type WithPatch<TableDefinition extends Table.AnyWithProps, Patch extends S.Codec<any, any>> = TableDefinition & {
  readonly Patch: Patch;
};

type Bind<Definition extends Table.UnnamedAnyWithProps, Name extends string> =
  Definition extends Table.UnnamedTable<infer Fields, infer Validator, infer Indexes, infer SearchIndexes, infer VectorIndexes>
    ? Table.Table<Name, Fields, Validator, Indexes, SearchIndexes, VectorIndexes>
    : never;

export const table = <const Name extends string, Definition extends Table.UnnamedAnyWithProps, Patch extends S.Codec<any, any>>(
  name: Name,
  definition: () => Definition,
  patch: () => Patch
): WithPatch<Bind<Definition, Name>, Patch> =>
  // Calling a generic callable through its existential constraint erases the
  // concrete schema/index parameters; `Bind` reconstructs that public Confect
  // return type while the runtime value remains the same bound table.
  Object.assign(definition()(name), { Patch: patch() }) as unknown as WithPatch<Bind<Definition, Name>, Patch>;
