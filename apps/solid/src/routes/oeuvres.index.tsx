import { createFileRoute, redirect } from "@tanstack/solid-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/oeuvres/")({
  beforeLoad: () => {
    throw redirect({ to: "/oeuvres/$slug", params: { slug: "ode-a-la-beaute" } });
  },
});
