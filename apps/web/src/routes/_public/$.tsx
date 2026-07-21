import { createFileRoute, notFound } from "@tanstack/react-router";

import { createNoindexHead } from "@/lib/seo";
import { NotFoundPage } from "@/routes/-not-found";

export const loadNotFound = () => {
  notFound({ throw: true });
  throw new Error("Unreachable after notFound");
};

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/$")({
  head: () => createNoindexHead("Page introuvable — Eliana Corré"),
  loader: loadNotFound,
  notFoundComponent: NotFoundPage,
});
