import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/mentions-legales')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/mentions-legales"!</div>
}
