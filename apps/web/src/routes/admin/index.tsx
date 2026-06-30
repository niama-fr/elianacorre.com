import { createFileRoute, redirect } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    redirect({ throw: true, to: "/admin/ebooks" });
  },
});
