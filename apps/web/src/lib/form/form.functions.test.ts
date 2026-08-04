import { getFormData, initialFormState } from "@tanstack/react-form-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveServerFormState } from "./form.functions";

vi.mock(import("@tanstack/react-form-start"), { spy: true });
vi.mock(import("@tanstack/react-start/server"), { spy: true });

describe(resolveServerFormState, () => {
  beforeEach(() => {
    vi.mocked(getFormData).mockReset();
    vi.mocked(getRequestHeader).mockReset();
  });

  it("returns the initial state without consuming form data when the request has no form cookie", async () => {
    vi.mocked(getRequestHeader).mockReturnValue("analytics=enabled");

    await expect(resolveServerFormState()).resolves.toBe(initialFormState);
    expect(getFormData).not.toHaveBeenCalled();
  });

  it("consumes form data when the request contains the TanStack form cookie", async () => {
    const submittedFormState = { errorMap: { onServer: undefined }, errors: [] };
    vi.mocked(getRequestHeader).mockReturnValue("analytics=enabled; _tanstack_form_internals=serialized-state");
    vi.mocked(getFormData).mockResolvedValue(submittedFormState);

    await expect(resolveServerFormState()).resolves.toBe(submittedFormState);
    expect(getFormData).toHaveBeenCalledOnce();
  });
});
