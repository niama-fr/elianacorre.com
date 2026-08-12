import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => {
    redirect({ replace: true, throw: true, to: "/admin/ebooks" });
  },
});
