import { createFileRoute, redirect } from "@tanstack/solid-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/oeuvres/")({
  beforeLoad: () => {
    redirect({ params: { slug: "ode-a-la-beaute" }, throw: true, to: "/oeuvres/$slug" });
  },
});
