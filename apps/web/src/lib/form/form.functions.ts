import { getFormData } from "@tanstack/react-form-start";
import { createServerFn } from "@tanstack/react-start";

export const getServerFormState = createServerFn({ method: "GET" }).handler(async () => await getFormData());
export type ServerFormState = Awaited<ReturnType<typeof getServerFormState>>;
