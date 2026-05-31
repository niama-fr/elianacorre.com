import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/oeuvres')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/oeuvres"!</div>
}
