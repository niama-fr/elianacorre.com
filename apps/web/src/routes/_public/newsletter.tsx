import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/newsletter")({ component: NewsletterLayout });

function NewsletterLayout() {
  return <Outlet />;
}
