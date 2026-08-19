/* oxlint-disable typescript/no-unnecessary-type-parameters, typescript/promise-function-async -- Named table parameters preserve registry/schema correlation, and Effect.promise factories intentionally return Convex's existing promises without redundant async wrappers. */
import type { GenericId } from "@confect/core";
import type {
  DocumentByName,
  ExpressionOrValue,
  FilterBuilder,
  GenericDataModel,
  GenericDatabaseReader,
  GenericDatabaseWriter,
  Indexes,
  IndexRange,
  IndexRangeBuilder,
  NamedIndex,
  NamedSearchIndex,
  NamedTableInfo,
  OrderedQuery as NativeOrderedQuery,
  PaginationOptions,
  PaginationResult,
  Query as NativeQuery,
  QueryInitializer as NativeQueryInitializer,
  SearchFilter,
  SearchFilterBuilder,
  SearchIndexes,
  TableNamesInDataModel,
} from "convex/server";
import { Context, Effect as E, Layer as L, Option, Schema as S } from "effect";

import type { EffexTable } from "./table";

type AnyTable = EffexTable;
type TableRegistry = Readonly<Record<string, AnyTable>>;

type CoherentRegistry<DataModel extends GenericDataModel, Tables extends TableRegistry> = Tables & {
  readonly [Name in keyof Tables]: Name extends TableNamesInDataModel<DataModel> ? Tables[Name] & { readonly tableName: Name } : never;
};

type RegisteredTable<Tables extends TableRegistry, Name extends keyof Tables & string> = Tables[Name];
type RegisteredDoc<Tables extends TableRegistry, Name extends keyof Tables & string> = S.Schema.Type<RegisteredTable<Tables, Name>["Doc"]>;
type RegisteredFields<Tables extends TableRegistry, Name extends keyof Tables & string> = S.Schema.Type<
  RegisteredTable<Tables, Name>["Fields"]
>;
export type RegisteredPatch<Tables extends TableRegistry, Name extends keyof Tables & string> = S.Schema.Type<
  RegisteredTable<Tables, Name>["Patch"]
>;

type TableName<DataModel extends GenericDataModel, Tables extends TableRegistry> = keyof Tables & TableNamesInDataModel<DataModel>;

export type OrderedQuery<DataModel extends GenericDataModel, Tables extends TableRegistry, Name extends TableName<DataModel, Tables>> = {
  readonly collect: () => E.Effect<readonly RegisteredDoc<Tables, Name>[]>;
  readonly filter: (
    predicate: (query: FilterBuilder<NamedTableInfo<DataModel, Name>>) => ExpressionOrValue<boolean>
  ) => OrderedQuery<DataModel, Tables, Name>;
  readonly first: () => E.Effect<Option.Option<RegisteredDoc<Tables, Name>>>;
  readonly paginate: (options: PaginationOptions) => E.Effect<PaginationResult<RegisteredDoc<Tables, Name>>>;
  readonly take: (count: number) => E.Effect<readonly RegisteredDoc<Tables, Name>[]>;
  readonly unique: () => E.Effect<Option.Option<RegisteredDoc<Tables, Name>>>;
};

export type Query<
  DataModel extends GenericDataModel,
  Tables extends TableRegistry,
  Name extends TableName<DataModel, Tables>,
> = OrderedQuery<DataModel, Tables, Name> & {
  readonly order: (direction: "asc" | "desc") => OrderedQuery<DataModel, Tables, Name>;
};

export type QueryInitializer<
  DataModel extends GenericDataModel,
  Tables extends TableRegistry,
  Name extends TableName<DataModel, Tables>,
> = Query<DataModel, Tables, Name> & {
  readonly fullTableScan: () => Query<DataModel, Tables, Name>;
  readonly withIndex: <IndexName extends keyof Indexes<NamedTableInfo<DataModel, Name>>>(
    indexName: IndexName,
    indexRange?: (
      query: IndexRangeBuilder<DocumentByName<DataModel, Name>, NamedIndex<NamedTableInfo<DataModel, Name>, IndexName>>
    ) => IndexRange
  ) => Query<DataModel, Tables, Name>;
  readonly withSearchIndex: <IndexName extends keyof SearchIndexes<NamedTableInfo<DataModel, Name>>>(
    indexName: IndexName,
    searchFilter: (
      query: SearchFilterBuilder<DocumentByName<DataModel, Name>, NamedSearchIndex<NamedTableInfo<DataModel, Name>, IndexName>>
    ) => SearchFilter
  ) => OrderedQuery<DataModel, Tables, Name>;
};

export type DatabaseReader<DataModel extends GenericDataModel, Tables extends TableRegistry> = {
  readonly raw: GenericDatabaseReader<DataModel>;
  readonly get: <Name extends TableName<DataModel, Tables>>(
    tableName: Name,
    id: GenericId.GenericId<Name>
  ) => E.Effect<Option.Option<RegisteredDoc<Tables, Name>>>;
  readonly normalizeId: <Name extends TableName<DataModel, Tables>>(
    tableName: Name,
    value: string
  ) => Option.Option<GenericId.GenericId<Name>>;
  readonly query: <Name extends TableName<DataModel, Tables>>(tableName: Name) => QueryInitializer<DataModel, Tables, Name>;
};

export type DatabaseWriter<DataModel extends GenericDataModel, Tables extends TableRegistry> = {
  readonly raw: GenericDatabaseWriter<DataModel>;
  readonly delete: <Name extends TableName<DataModel, Tables>>(tableName: Name, id: GenericId.GenericId<Name>) => E.Effect<void>;
  readonly insert: <Name extends TableName<DataModel, Tables>>(
    tableName: Name,
    fields: RegisteredFields<Tables, Name>
  ) => E.Effect<GenericId.GenericId<Name>>;
  readonly patch: <Name extends TableName<DataModel, Tables>>(
    tableName: Name,
    id: GenericId.GenericId<Name>,
    patch: RegisteredPatch<Tables, Name>
  ) => E.Effect<void>;
  readonly replace: <Name extends TableName<DataModel, Tables>>(
    tableName: Name,
    id: GenericId.GenericId<Name>,
    fields: RegisteredFields<Tables, Name>
  ) => E.Effect<void>;
} & DatabaseReader<DataModel, Tables>;

const decodeDocument =
  <Tables extends TableRegistry, Name extends keyof Tables & string>(tables: Tables, tableName: Name) =>
  (value: unknown) =>
    S.decodeUnknownEffect(tables[tableName].Doc)(value).pipe(E.orDie);

const decodeDocuments =
  <Tables extends TableRegistry, Name extends keyof Tables & string>(tables: Tables, tableName: Name) =>
  (documents: readonly unknown[]) =>
    // oxlint-disable-next-line unicorn/no-array-method-this-argument -- Effect.forEach takes the callback as its second argument; this is not Array.forEach's thisArg.
    E.forEach(documents, (document) => decodeDocument(tables, tableName)(document));

const decodeOptionalDocument = <Tables extends TableRegistry, Name extends keyof Tables & string>(
  tables: Tables,
  tableName: Name,
  document: unknown
) => (document === null ? E.succeed(Option.none()) : decodeDocument(tables, tableName)(document).pipe(E.map(Option.some)));

const orderedQuery = <DataModel extends GenericDataModel, Tables extends TableRegistry, Name extends TableName<DataModel, Tables>>(
  tables: Tables,
  tableName: Name,
  query: NativeOrderedQuery<NamedTableInfo<DataModel, Name>>
): OrderedQuery<DataModel, Tables, Name> => ({
  collect: () => E.promise(() => query.collect()).pipe(E.andThen(decodeDocuments(tables, tableName))),
  filter: (predicate) => orderedQuery(tables, tableName, query.filter(predicate)),
  first: () => E.promise(() => query.first()).pipe(E.andThen((doc) => decodeOptionalDocument(tables, tableName, doc))),
  paginate: (options) =>
    E.promise(() => query.paginate(options)).pipe(
      E.andThen((page) => decodeDocuments(tables, tableName)(page.page).pipe(E.map((decoded) => ({ ...page, page: decoded }))))
    ),
  take: (count) => E.promise(() => query.take(count)).pipe(E.andThen(decodeDocuments(tables, tableName))),
  unique: () => E.promise(() => query.unique()).pipe(E.andThen((doc) => decodeOptionalDocument(tables, tableName, doc))),
});

const unorderedQuery = <DataModel extends GenericDataModel, Tables extends TableRegistry, Name extends TableName<DataModel, Tables>>(
  tables: Tables,
  tableName: Name,
  query: NativeQuery<NamedTableInfo<DataModel, Name>>
): Query<DataModel, Tables, Name> => ({
  ...orderedQuery(tables, tableName, query),
  order: (direction) => orderedQuery(tables, tableName, query.order(direction)),
});

const queryInitializer = <DataModel extends GenericDataModel, Tables extends TableRegistry, Name extends TableName<DataModel, Tables>>(
  tables: Tables,
  tableName: Name,
  query: NativeQueryInitializer<NamedTableInfo<DataModel, Name>>
): QueryInitializer<DataModel, Tables, Name> => ({
  ...unorderedQuery(tables, tableName, query),
  fullTableScan: () => unorderedQuery(tables, tableName, query.fullTableScan()),
  withIndex: (indexName, indexRange) => unorderedQuery(tables, tableName, query.withIndex(indexName, indexRange)),
  withSearchIndex: (indexName, searchFilter) => orderedQuery(tables, tableName, query.withSearchIndex(indexName, searchFilter)),
});

const makeReader = <DataModel extends GenericDataModel, Tables extends TableRegistry>(
  tables: Tables,
  raw: GenericDatabaseReader<DataModel>
): DatabaseReader<DataModel, Tables> => ({
  get: (tableName, id) => E.promise(() => raw.get(tableName, id)).pipe(E.andThen((doc) => decodeOptionalDocument(tables, tableName, doc))),
  normalizeId: (tableName, value) => Option.fromNullOr(raw.normalizeId(tableName, value)),
  query: (tableName) => queryInitializer(tables, tableName, raw.query(tableName)),
  raw,
});

const encodeFields =
  <Tables extends TableRegistry, Name extends keyof Tables & string>(tables: Tables, tableName: Name) =>
  (value: RegisteredFields<Tables, Name>) =>
    S.encodeEffect(tables[tableName].Fields)(value).pipe(E.orDie);

const encodePatch =
  <Tables extends TableRegistry, Name extends keyof Tables & string>(tables: Tables, tableName: Name) =>
  (value: RegisteredPatch<Tables, Name>) =>
    S.encodeEffect(tables[tableName].Patch)(value).pipe(E.orDie);

const makeWriter = <DataModel extends GenericDataModel, Tables extends TableRegistry>(
  tables: Tables,
  raw: GenericDatabaseWriter<DataModel>
): DatabaseWriter<DataModel, Tables> => ({
  ...makeReader(tables, raw),
  delete: (tableName, id) => E.promise(() => raw.delete(tableName, id)),
  insert: (tableName, fields) =>
    encodeFields(
      tables,
      tableName
    )(fields).pipe(
      E.andThen((encoded) =>
        // Confect's existential Fields codec hides the encoded Convex document type.
        E.promise(() => raw.insert(tableName, encoded as never))
      )
    ),
  patch: (tableName, id, patch) =>
    encodePatch(
      tables,
      tableName
    )(patch).pipe(
      E.andThen((encoded) =>
        // Confect's existential Patch codec hides the encoded Convex PatchValue type.
        E.promise(() => raw.patch(tableName, id, encoded as never))
      )
    ),
  raw,
  replace: (tableName, id, fields) =>
    encodeFields(
      tables,
      tableName
    )(fields).pipe(
      E.andThen((encoded) =>
        // Confect's existential Fields codec hides the encoded Convex document type.
        E.promise(() => raw.replace(tableName, id, encoded as never))
      )
    ),
});

let databaseIdentity = 0;

export const database = <DataModel extends GenericDataModel, const Tables extends TableRegistry>(
  tables: CoherentRegistry<DataModel, Tables>
) => {
  const identity = databaseIdentity;
  databaseIdentity += 1;
  const Reader = Context.Service<DatabaseReader<DataModel, Tables>>(`effex/DatabaseReader/${identity}`);
  const Writer = Context.Service<DatabaseWriter<DataModel, Tables>>(`effex/DatabaseWriter/${identity}`);

  return {
    Reader,
    Writer,
    readerLayer: (raw: GenericDatabaseReader<DataModel>) => L.succeed(Reader, makeReader(tables, raw)),
    writerLayer: (raw: GenericDatabaseWriter<DataModel>) => {
      const writer = makeWriter(tables, raw);
      return L.merge(L.succeed(Reader, writer), L.succeed(Writer, writer));
    },
  } as const;
};
