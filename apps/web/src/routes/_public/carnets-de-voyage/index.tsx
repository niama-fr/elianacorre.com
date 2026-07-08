import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/carnets-de-voyage/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello !</div>;
}
