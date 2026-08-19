/* oxlint-disable typescript/no-explicit-any, typescript/no-unsafe-argument, typescript/no-unsafe-assignment, unicorn/no-useless-undefined, vitest/require-mock-type-parameters -- Focused test doubles intentionally implement only the Convex methods exercised by the adapter. */
import type { GenericId } from "@confect/core";
import { Table } from "@confect/server";
import { Effect as E, Layer as L, Option, Schema as S } from "effect";
import { describe, expect, it, vi } from "vitest";

import { database } from "./database";
import { table } from "./table";

const NotesFields = S.Struct({ body: S.String, pinned: S.optionalKey(S.Boolean) });
const NotesPatch = S.Struct({ pinned: S.optionalKey(S.Boolean) });
const Notes = table(
  "notes",
  () =>
    Table.make(() => NotesFields)
      .index("by_pinned", ["pinned"])
      .searchIndex("search_body", { searchField: "body" }),
  () => NotesPatch
);
type NotesDataModel = {
  notes: {
    document: {
      readonly _creationTime: number;
      readonly _id: GenericId.GenericId<"notes">;
      readonly body: string;
      readonly pinned?: boolean;
    };
    fieldPaths: "_creationTime" | "_id" | "body" | "pinned";
    indexes: { by_pinned: ["pinned", "_creationTime"] };
    searchIndexes: { search_body: { filterFields: never; searchField: "body" } };
    vectorIndexes: Record<never, never>;
  };
};

const db = database<NotesDataModel, { readonly notes: typeof Notes }>({ notes: Notes });

describe("native Convex database services", () => {
  it("keeps query().withIndex(), optional get(), and the raw reader escape hatch", async () => {
    const document = { _creationTime: 1, _id: "notes:1", body: "hello", pinned: true };
    const first = vi.fn().mockResolvedValue(null);
    const unique = vi.fn().mockResolvedValue(document);
    const withIndex = vi.fn().mockReturnValue({ first, unique });
    const query = vi.fn().mockReturnValue({ withIndex });
    const get = vi.fn().mockResolvedValue(null);
    const normalizeId = vi.fn().mockReturnValue("notes:1");
    const raw = { get, normalizeId, query } as any;
    const reader = await E.runPromise(E.provide(db.Reader, db.readerLayer(raw)));

    expect(Option.isNone(await E.runPromise(reader.get("notes", "notes:missing" as any)))).toBeTruthy();
    expect(Option.isNone(await E.runPromise(reader.query("notes").withIndex("by_pinned").first()))).toBeTruthy();
    const found = await E.runPromise(
      reader
        .query("notes")
        .withIndex("by_pinned", (q) => q.eq("pinned", true))
        .unique()
    );
    expect(Option.getOrThrow(found)).toStrictEqual(document);
    expect(reader.raw).toBe(raw);
    expect(withIndex).toHaveBeenCalledWith("by_pinned", expect.any(Function));
  });

  it("normalizes IDs synchronously with Option absence", async () => {
    const normalizeId = vi.fn().mockImplementation((_tableName, value: string) => (value === "notes:1" ? value : null));
    const reader = await E.runPromise(E.provide(db.Reader, db.readerLayer({ normalizeId } as any)));

    expect(Option.getOrThrow(reader.normalizeId("notes", "notes:1"))).toBe("notes:1");
    expect(Option.isNone(reader.normalizeId("notes", "invalid"))).toBeTruthy();
  });

  it("preserves native unique() invariant failures", async () => {
    const unique = vi.fn().mockRejectedValue(new Error("Query returned more than one document"));
    const raw = { query: vi.fn().mockReturnValue({ withIndex: vi.fn().mockReturnValue({ unique }) }) } as any;
    const reader = await E.runPromise(E.provide(db.Reader, db.readerLayer(raw)));

    await expect(E.runPromise(reader.query("notes").withIndex("by_pinned").unique())).rejects.toThrow(
      "Query returned more than one document"
    );
  });

  it("preserves native ordering after an indexed query", async () => {
    const document = { _creationTime: 1, _id: "notes:1", body: "hello", pinned: true };
    const paginate = vi.fn().mockResolvedValue({ continueCursor: "done", isDone: true, page: [document] });
    const order = vi.fn().mockReturnValue({ paginate });
    const withIndex = vi.fn().mockReturnValue({ order });
    const raw = { query: vi.fn().mockReturnValue({ withIndex }) } as any;
    const reader = await E.runPromise(E.provide(db.Reader, db.readerLayer(raw)));

    await expect(
      E.runPromise(reader.query("notes").withIndex("by_pinned").order("desc").paginate({ cursor: null, numItems: 10 }))
    ).resolves.toMatchObject({ page: [document] });
    expect(order).toHaveBeenCalledWith("desc");
  });

  it("uses Convex patch directly without a read or replacement", async () => {
    const get = vi.fn();
    const patch = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const replace = vi.fn();
    const raw = { get, patch, replace } as any;
    const writer = await E.runPromise(E.provide(db.Writer, db.writerLayer(raw)));

    await E.runPromise(writer.patch("notes", "notes:1" as any, { pinned: false }));

    expect(patch).toHaveBeenCalledWith("notes", "notes:1", { pinned: false });
    expect(get).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("uses Confect's Effect Schema compiler for the Convex table definition", () => {
    expect(Reflect.get(Notes.tableDefinition.validator, "json")).toMatchObject({ type: "object" });
  });

  it("keeps separately created database services distinct in one Context", async () => {
    const otherDb = database<NotesDataModel, { readonly notes: typeof Notes }>({ notes: Notes });
    const firstRaw = { marker: "first" } as any;
    const secondRaw = { marker: "second" } as any;
    const program = E.all([db.Reader, otherDb.Reader]);

    const [first, second] = await E.runPromise(program.pipe(E.provide(L.merge(db.readerLayer(firstRaw), otherDb.readerLayer(secondRaw)))));

    expect(first.raw).toBe(firstRaw);
    expect(second.raw).toBe(secondRaw);
  });

  it("provides Reader and Writer from the mutation layer", async () => {
    const raw = { marker: "mutation" } as any;
    const [reader, writer] = await E.runPromise(E.all([db.Reader, db.Writer]).pipe(E.provide(db.writerLayer(raw))));

    expect(reader.raw).toBe(raw);
    expect(writer.raw).toBe(raw);
  });
});

/* oxlint-disable typescript/no-unsafe-call -- Negative type tests intentionally call members that TypeScript has rejected. */
const compileTimeDatabaseRegressions = () => {
  const ordered = db.Reader.pipe(E.map((reader) => reader.query("notes").order("desc")));
  E.andThen(ordered, (query) =>
    E.sync(() => {
      // @ts-expect-error Convex queries cannot be ordered twice.
      query.order("asc");
    })
  );

  const searchOrdered = db.Reader.pipe(
    E.map((reader) => reader.query("notes").withSearchIndex("search_body", (query) => query.search("body", "hello")))
  );
  E.andThen(searchOrdered, (query) =>
    E.sync(() => {
      // @ts-expect-error Native search-index queries are already ordered by relevance.
      query.order("desc");
    })
  );

  db.Writer.pipe(
    E.andThen((writer) =>
      // @ts-expect-error `body` is deliberately excluded from Notes.Patch.
      writer.patch("notes", "notes:1" as GenericId.GenericId<"notes">, { body: "not patchable" })
    )
  );

  database<NotesDataModel, { readonly notes: typeof Notes }>({
    // @ts-expect-error The registry key must equal the bound Confect table name.
    notes: table(
      "other",
      () => Table.make(() => NotesFields),
      () => NotesPatch
    ),
  });
};
/* oxlint-enable typescript/no-unsafe-call */

void compileTimeDatabaseRegressions;
