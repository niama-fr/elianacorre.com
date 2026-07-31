import { createFileRoute, redirect } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: () => {
    redirect({ throw: true, to: "/ebooks" });
  },
});
