import { createFileRoute, Outlet } from "@tanstack/react-router";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public/newsletter")({ component: NewsletterLayout });

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function NewsletterLayout() {
  return <Outlet />;
}
