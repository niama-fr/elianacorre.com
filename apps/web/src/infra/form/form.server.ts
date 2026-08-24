import { getFormData, initialFormState } from "@tanstack/react-form-start";
import { getRequestHeader } from "@tanstack/react-start/server";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const TANSTACK_FORM_COOKIE = "_tanstack_form_internals";

// GET FORM STATE --------------------------------------------------------------------------------------------------------------------------
export type ServerFormState = Awaited<ReturnType<typeof getFormData>>;

export async function getFormState(): Promise<ServerFormState> {
  const cookieHeader = getRequestHeader("cookie");

  if (!hasCookie(cookieHeader, TANSTACK_FORM_COOKIE)) return initialFormState;

  return await getFormData();
}

// INTERNALS -------------------------------------------------------------------------------------------------------------------------------
function hasCookie(cookieHeader: string | undefined, name: string): boolean {
  return cookieHeader?.split(";").some((cookie) => cookie.trim().startsWith(`${name}=`)) ?? false;
}
