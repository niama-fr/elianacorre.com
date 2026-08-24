import type { Profiles } from "@ec/domain/schemas/profiles";
import { linkOptions } from "@tanstack/react-router";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const AUTH_REDIRECT_BASE = "https://authenticated.invalid";

const AUTHENTICATED_LANDINGS = {
  admin: linkOptions({ to: "/admin/ebooks" }),
  contact: linkOptions({ to: "/acces-refuse" }),
  member: linkOptions({ to: "/" }),
} satisfies Record<Profiles["Role"], object>;

// ROUTES ----------------------------------------------------------------------------------------------------------------------------------
export const getAuthenticatedLanding = ({ role }: Pick<Profiles["Entity"], "role">) => AUTHENTICATED_LANDINGS[role];

export const getSafeAuthRedirect = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  const redirect = URL.parse(value, AUTH_REDIRECT_BASE);
  return redirect?.origin === AUTH_REDIRECT_BASE ? `${redirect.pathname}${redirect.search}${redirect.hash}` : "/";
};
