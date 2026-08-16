// @vitest-environment jsdom

import { useAppForm } from "@ec/ui/hooks/app-form";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

function MarkdownForm() {
  const form = useAppForm({ defaultValues: { description: "**Brut**" } });
  return (
    <form.AppForm>
      <form.AppField name="description">
        {(field) => (
          <field.MarkdownField editLabel="Édition" label="Description" modeLabel="Mode d’édition de Description" previewLabel="Aperçu" />
        )}
      </form.AppField>
    </form.AppForm>
  );
}

describe("MarkdownField", () => {
  afterEach(cleanup);

  it("keeps raw Markdown in TanStack Form while previewing it with the shared renderer", () => {
    render(<MarkdownForm />);

    const textarea = screen.getByRole("textbox", { name: "Description" });
    expect((textarea as HTMLTextAreaElement).value).toBe("**Brut**");
    fireEvent.change(textarea, { target: { value: "# Nouveau" } });
    expect((textarea as HTMLTextAreaElement).value).toBe("# Nouveau");

    fireEvent.click(screen.getByRole("tab", { name: "Aperçu" }));
    expect(screen.getByRole("heading", { level: 1, name: "Nouveau" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Édition" }));
    const editedTextarea = screen.getByRole("textbox", { name: "Description" });
    expect(editedTextarea).toBeInstanceOf(HTMLTextAreaElement);
    if (!(editedTextarea instanceof HTMLTextAreaElement)) throw new TypeError("Expected the Markdown editor to use a textarea");
    expect(editedTextarea.value).toBe("# Nouveau");
  });
});
