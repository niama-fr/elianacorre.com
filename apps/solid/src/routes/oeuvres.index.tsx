import { createFileRoute, redirect } from "@tanstack/solid-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/oeuvres/")({
  beforeLoad: () => {
    throw redirect({ params: { slug: "ode-a-la-beaute" }, to: "/oeuvres/$slug" });
  },
});
