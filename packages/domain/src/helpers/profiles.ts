import type { Profiles } from "@ec/domain/schemas/profiles";

// ACCESSES --------------------------------------------------------------------------------------------------------------------------------
export const hasAdminAccess = ({ role }: Pick<Profiles["Entity"], "role">): boolean => role === "admin";
export const hasMemberAccess = ({ role }: Pick<Profiles["Entity"], "role">): boolean => role === "member";
