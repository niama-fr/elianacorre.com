import { FunctionSpec } from "@confect/core";
import { Effect as E, Layer as L, Schema as S } from "effect";

import { functionModule } from "./function";

const functions = functionModule("typeTests");
const sArgs = S.Struct({});
const sReturns = S.String;

const querySpec = FunctionSpec.publicQuery({
  args: () => sArgs,
  name: "query",
  returns: () => sReturns,
});
const mutationSpec = FunctionSpec.publicMutation({
  args: () => sArgs,
  name: "mutation",
  returns: () => sReturns,
});
const internalQuerySpec = FunctionSpec.internalQuery({
  args: () => sArgs,
  name: "internalQuery",
  returns: () => sReturns,
});

functions.query(querySpec);
functions.mutation(mutationSpec);

// @ts-expect-error A mutation spec cannot be registered as a query.
functions.query(mutationSpec);
// @ts-expect-error A query spec cannot be registered as a mutation.
functions.mutation(querySpec);
// @ts-expect-error Public registration cannot accept an internal spec.
functions.query(internalQuerySpec);

const queryDefinition = functions.query(querySpec);

queryDefinition.register(null as never, {
  handler: () => E.succeed("ok"),
  // @ts-expect-error A no-error FunctionSpec cannot receive a layer with a typed failure.
  layer: () => L.effectDiscard(E.fail("undeclared")),
});
