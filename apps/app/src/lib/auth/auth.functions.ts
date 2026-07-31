import { createServerFn } from "@tanstack/react-start";

import { getToken } from "@/lib/auth/auth.server";

// FETCH TOKEN -----------------------------------------------------------------------------------------------------------------------------
export const fetchToken = createServerFn({ method: "GET" }).handler(async () => await getToken());
