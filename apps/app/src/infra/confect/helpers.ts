import type { Ref } from "@confect/core";
import type { PaginatedQueryOptions, PaginatedQueryResult } from "@confect/react";
import { usePaginatedQuery as usePaginatedQuery_ } from "@confect/react";

type PaginatedItem<Query extends Ref.AnyPublicQuery> = Ref.Returns<Query> extends { readonly page: readonly (infer Item)[] } ? Item : never;
type PaginatedArgs<Query extends Ref.AnyPublicQuery> =
  Omit<Ref.Args<Query>, "paginationOpts"> extends infer Args ? (keyof Args extends never ? Record<string, never> : Args) : never;

// Confect next.17 requires a mutable page array in AnyPublicPaginatedQuery, while generated Ref returns are readonly.
export const usePaginatedQuery = usePaginatedQuery_ as unknown as <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: PaginatedArgs<Query>,
  options: PaginatedQueryOptions
) => PaginatedQueryResult.PaginatedQueryResult<PaginatedItem<Query>, Ref.Error<Query>>;
