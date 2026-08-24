import { convexQuery } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

const currentProfileQuery = convexQuery(api.profiles.current);

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context: { queryClient, token }, location: { href } }) => {
    if (token === undefined) redirect({ search: { redirect: href }, throw: true, to: "/connexion" });
    return { profile: await queryClient.query({ ...currentProfileQuery, staleTime: "static" }) };
  },
  component: AuthenticatedBoundary,
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function AuthenticatedBoundary() {
  return <Outlet />;
}
