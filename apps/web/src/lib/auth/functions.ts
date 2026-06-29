import { createServerFn } from "@tanstack/react-start";

import { getToken } from "@/lib/auth/index.server";

// FETCH TOKEN -----------------------------------------------------------------------------------------------------------------------------
export const fetchToken = createServerFn({ method: "GET" }).handler(async () => await getToken());
