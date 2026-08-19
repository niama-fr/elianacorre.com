/* oxlint-disable typescript/no-unnecessary-type-parameters, typescript/promise-function-async -- Confect's public FunctionSpec existential hides its codecs; handlers return the existing Confect runtime Promise without a redundant async wrapper. */
import { Ref } from "@confect/core";
import type { FunctionProvenance, FunctionSpec } from "@confect/core";
import { SchemaToValidator } from "@confect/server";
import type {
  DefaultFunctionArgs,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  MutationBuilder,
  QueryBuilder,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";
import type { Value } from "convex/values";
import { Effect as E, type Layer as L, Schema as S } from "effect";

import { runMutation, runQuery } from "./runtime";

type ConfectSpec = FunctionSpec.AnyConfect;
type PublicQuerySpec = FunctionSpec.FunctionSpec<
  { readonly functionType: "query"; readonly runtime: "Convex" },
  "public",
  string,
  FunctionProvenance.AnyConfect
>;
type PublicMutationSpec = FunctionSpec.FunctionSpec<
  { readonly functionType: "mutation"; readonly runtime: "Convex" },
  "public",
  string,
  FunctionProvenance.AnyConfect
>;

const provenance = (spec: ConfectSpec) => spec.functionProvenance;

const registerQuery = <
  DataModel extends GenericDataModel,
  Args,
  ConvexArgs extends DefaultFunctionArgs,
  Returns,
  ConvexReturns extends Value,
  Error,
  Requirements,
>(
  query: QueryBuilder<DataModel, "public">,
  spec: ConfectSpec,
  options: {
    readonly handler: (args: Args) => E.Effect<Returns, Error, Requirements>;
    readonly layer: (ctx: GenericQueryCtx<DataModel>) => L.Layer<Requirements, Error>;
  }
) => {
  const { args, error, returns } = provenance(spec) as {
    readonly args: S.Codec<Args, ConvexArgs>;
    readonly error: S.Codec<unknown, unknown> | undefined;
    readonly returns: S.Codec<Returns, ConvexReturns>;
  };

  return query({
    args: SchemaToValidator.compileArgsSchema(args),
    handler: (ctx, encodedArgs) =>
      runQuery(
        error,
        E.gen(function* () {
          const decodedArgs = yield* S.decodeUnknownEffect(args)(encodedArgs).pipe(E.orDie);
          const decodedReturns = yield* options.handler(decodedArgs).pipe(E.provide(options.layer(ctx)));
          return yield* S.encodeEffect(returns)(decodedReturns).pipe(E.orDie);
        })
      ),
    returns: SchemaToValidator.compileReturnsSchema(returns),
  });
};

const registerMutation = <
  DataModel extends GenericDataModel,
  Args,
  ConvexArgs extends DefaultFunctionArgs,
  Returns,
  ConvexReturns extends Value,
  Error,
  Requirements,
>(
  mutation: MutationBuilder<DataModel, "public">,
  spec: ConfectSpec,
  options: {
    readonly handler: (args: Args) => E.Effect<Returns, Error, Requirements>;
    readonly layer: (ctx: GenericMutationCtx<DataModel>) => L.Layer<Requirements, Error>;
  }
) => {
  const { args, error, returns } = provenance(spec) as {
    readonly args: S.Codec<Args, ConvexArgs>;
    readonly error: S.Codec<unknown, unknown> | undefined;
    readonly returns: S.Codec<Returns, ConvexReturns>;
  };

  return mutation({
    args: SchemaToValidator.compileArgsSchema(args),
    handler: (ctx, encodedArgs) =>
      runMutation(
        error,
        E.gen(function* () {
          const decodedArgs = yield* S.decodeUnknownEffect(args)(encodedArgs).pipe(E.orDie);
          const decodedReturns = yield* options.handler(decodedArgs).pipe(E.provide(options.layer(ctx)));
          return yield* S.encodeEffect(returns)(decodedReturns).pipe(E.orDie);
        })
      ),
    returns: SchemaToValidator.compileReturnsSchema(returns),
  });
};

export const functionModule = (namespace: string) => ({
  mutation: <Spec extends PublicMutationSpec>(spec: Spec) => ({
    ref: Ref.make(namespace, spec),
    register: <DataModel extends GenericDataModel, Requirements>(
      mutation: MutationBuilder<DataModel, "public">,
      options: {
        readonly handler: (args: FunctionSpec.Args<Spec>) => E.Effect<FunctionSpec.Returns<Spec>, FunctionSpec.Error<Spec>, Requirements>;
        readonly layer: (ctx: GenericMutationCtx<DataModel>) => L.Layer<Requirements, FunctionSpec.Error<Spec>>;
      }
    ) =>
      registerMutation(mutation, spec, options) as RegisteredMutation<
        "public",
        FunctionSpec.EncodedArgs<Spec>,
        FunctionSpec.EncodedReturns<Spec>
      >,
  }),
  query: <Spec extends PublicQuerySpec>(spec: Spec) => ({
    ref: Ref.make(namespace, spec),
    register: <DataModel extends GenericDataModel, Requirements>(
      query: QueryBuilder<DataModel, "public">,
      options: {
        readonly handler: (args: FunctionSpec.Args<Spec>) => E.Effect<FunctionSpec.Returns<Spec>, FunctionSpec.Error<Spec>, Requirements>;
        readonly layer: (ctx: GenericQueryCtx<DataModel>) => L.Layer<Requirements, FunctionSpec.Error<Spec>>;
      }
    ) =>
      registerQuery(query, spec, options) as RegisteredQuery<"public", FunctionSpec.EncodedArgs<Spec>, FunctionSpec.EncodedReturns<Spec>>,
  }),
});
