import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/qui-suis-je")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/qui-suis-je"!</div>;
}
