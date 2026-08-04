import { createFileRoute, notFound } from "@tanstack/react-router";

import { NotFoundPage } from "@/routes/-not-found";
import { noindexHead } from "@/seo/head";

export const loadNotFound = () => {
  notFound({ throw: true });
  throw new Error("Unreachable after notFound");
};

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/$")({
  head: () => noindexHead("Page introuvable — Eliana Corré"),
  loader: loadNotFound,
  notFoundComponent: NotFoundPage,
});
