// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createContactRequest } from "@/lib/contact-requests/contact-requests.functions";
import { requestEbookRecovery } from "@/lib/ebooks/ebooks.functions";
import { ContactForm } from "@/routes/_public/contact/-form";
import { EbookRecoveryFormDialog } from "@/routes/_public/newsletter/-ebook-recovery-form-dialog";

vi.mock(import("canvas-confetti"), { spy: true });
vi.mock(import("sonner"), { spy: true });
vi.mock(import("@/lib/contact-requests/contact-requests.functions"), { spy: true });
vi.mock(import("@/lib/ebooks/ebooks.functions"), { spy: true });

describe("public form actions", () => {
  beforeEach(() => {
    vi.mocked(confetti).mockReturnValue(null);
    vi.mocked(toast.error).mockReturnValue("error-toast");
    vi.mocked(toast.success).mockReturnValue("success-toast");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("allows a contact request to retry after failure", async () => {
    const retry = Promise.withResolvers<never>();
    vi.mocked(createContactRequest).mockRejectedValueOnce(new Error("unavailable")).mockReturnValueOnce(retry.promise);
    render(<ContactForm />);

    fireEvent.change(screen.getByPlaceholderText("Prénom"), { target: { value: "Eliana" } });
    fireEvent.change(screen.getByPlaceholderText("Courriel"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Message"), { target: { value: "Bonjour" } });

    const submit = screen.getByRole("button", { name: /Envoyer/u });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce();
      expect(submit).toHaveProperty("disabled", false);
    });

    fireEvent.click(submit);
    await waitFor(() => {
      expect(createContactRequest).toHaveBeenCalledTimes(2);
      expect(submit).toHaveProperty("disabled", true);
    });
  });

  it("allows an e-book recovery request to retry after failure", async () => {
    vi.mocked(requestEbookRecovery).mockRejectedValueOnce(new Error("unavailable")).mockResolvedValueOnce(null);
    render(<EbookRecoveryFormDialog />);

    fireEvent.click(screen.getByRole("button", { name: /Recevoir un nouveau lien/u }));
    fireEvent.change(await screen.findByLabelText("Adresse e-mail"), { target: { value: "reader@example.com" } });

    const submit = screen.getByRole("button", { name: /Recevoir un nouveau lien/u });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce();
      expect(submit).toHaveProperty("disabled", false);
    });

    fireEvent.click(submit);
    await waitFor(() => {
      expect(requestEbookRecovery).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledOnce();
    });
  });
});
