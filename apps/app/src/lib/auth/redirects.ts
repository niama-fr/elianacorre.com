import type { Profiles } from "@ec/domain/schemas/profiles";
import { z } from "@ec/validation/zod";
import { linkOptions } from "@tanstack/react-router";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const AUTH_REDIRECT_BASE = "https://authenticated.invalid";

const AUTHENTICATED_LANDINGS = {
  admin: linkOptions({ to: "/admin/ebooks" }),
  contact: linkOptions({ to: "/acces-refuse" }),
  member: linkOptions({ to: "/" }),
} satisfies Record<Profiles["Role"], object>;

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const zAuthRedirect = z
  .string()
  .startsWith("/")
  .transform((value, ctx) => {
    const redirect = URL.parse(value, AUTH_REDIRECT_BASE);
    if (redirect?.origin !== AUTH_REDIRECT_BASE) {
      ctx.issues.push({ code: "custom", input: value, message: "Invalid auth redirect" });
      return z.NEVER;
    }
    return `${redirect.pathname}${redirect.search}${redirect.hash}`;
  })
  // oxlint-disable-next-line promise/prefer-await-to-then
  .catch("/");

// ROUTES ----------------------------------------------------------------------------------------------------------------------------------
export const getAuthenticatedLanding = ({ role }: Pick<Profiles["Entity"], "role">) => AUTHENTICATED_LANDINGS[role];

export const getSafeAuthRedirect = (value: unknown): string => zAuthRedirect.parse(value);
