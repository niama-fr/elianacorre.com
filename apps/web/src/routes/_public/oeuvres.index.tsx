import { createFileRoute, redirect } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/oeuvres/")({
  beforeLoad: () => {
    redirect({ params: { slug: "ode-a-la-beaute" }, throw: true, to: "/oeuvres/$slug" });
  },
});
