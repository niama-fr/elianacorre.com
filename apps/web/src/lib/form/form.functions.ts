import { createServerFn } from "@tanstack/react-start";

import { getFormState } from "./form.server";

// GET SERVER FORM STATE -------------------------------------------------------------------------------------------------------------------
export type { ServerFormState } from "./form.server";
export const getServerFormState = createServerFn({ method: "GET" }).handler(async () => await getFormState());
