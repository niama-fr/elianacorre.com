// @vitest-environment jsdom

import { zNewsletterLegalBundle } from "@ec/domain/schemas/newsletter-legal-bundles";
import { initialFormState } from "@tanstack/react-form-start";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToNewsletter } from "@/lib/newsletter/newsletter.functions";
import { NewsletterForm } from "@/routes/_public/-newsletter.form";

vi.mock(import("canvas-confetti"), { spy: true });
vi.mock(import("sonner"), { spy: true });
vi.mock(import("@/lib/newsletter/newsletter.functions"), { spy: true });

const ACTIVE_LEGAL_BUNDLE = zNewsletterLegalBundle.parse({
  _creationTime: 1,
  _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw3",
  newsletterConsent: {
    _creationTime: 1,
    _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw4",
    content: "J’accepte de recevoir la lettre.",
    kind: "newsletterConsent",
    publishedAt: 1,
    publishedBy: null,
  },
  newsletterConsentId: "k170e5dj9c8heby7eah6c4mr6h7a7tw4",
  privacyNotice: {
    _creationTime: 1,
    _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw5",
    content: "Notice de confidentialité.",
    kind: "privacyNotice",
    publishedAt: 1,
    publishedBy: null,
  },
  privacyNoticeId: "k170e5dj9c8heby7eah6c4mr6h7a7tw5",
  publishedAt: 1,
  publishedBy: null,
});

const renderValidNewsletterForm = () => {
  const view = render(<NewsletterForm bundle={ACTIVE_LEGAL_BUNDLE} formState={initialFormState} />);

  fireEvent.change(screen.getByPlaceholderText("Adresse e-mail"), { target: { value: "reader@example.com" } });
  fireEvent.click(screen.getByRole("checkbox"));

  return view;
};

describe("newsletter submission", () => {
  beforeEach(() => {
    vi.mocked(confetti).mockReturnValue(null);
    vi.mocked(toast.error).mockReturnValue("error-toast");
    vi.mocked(toast.success).mockReturnValue("success-toast");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("disables submission while one request is pending and ignores a rapid second click", async () => {
    const request = Promise.withResolvers<null>();
    vi.mocked(subscribeToNewsletter).mockReturnValue(request.promise);
    renderValidNewsletterForm();

    const submit = screen.getByRole("button", { name: /M’inscrire/u });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => {
      expect(subscribeToNewsletter).toHaveBeenCalledOnce();
      expect(submit).toHaveProperty("disabled", true);
    });

    request.resolve(null);
    await waitFor(() => {
      expect(submit).toHaveProperty("disabled", false);
    });
  });

  it("resets the form and reports success", async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue(null);
    renderValidNewsletterForm();

    fireEvent.click(screen.getByRole("button", { name: /M’inscrire/u }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledOnce();
      expect(screen.getByPlaceholderText("Adresse e-mail")).toHaveProperty("value", "");
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(confetti).toHaveBeenCalledOnce();
  });

  it("reports failure and allows a successful retry", async () => {
    vi.mocked(subscribeToNewsletter).mockRejectedValueOnce(new Error("unavailable")).mockResolvedValueOnce(null);
    renderValidNewsletterForm();

    const submit = screen.getByRole("button", { name: /M’inscrire/u });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledOnce();
      expect(submit).toHaveProperty("disabled", false);
    });

    fireEvent.click(submit);
    await waitFor(() => {
      expect(subscribeToNewsletter).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledOnce();
    });
  });
});
