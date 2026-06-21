import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/carnets-de-voyage")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/carnets-de-voyage"!</div>;
}
