import { ImageZoom } from "@ec/ui/image-zoom";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("image zoom behavior", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders closed without touching the unmounted zoom modal", () => {
    expect(() =>
      render(() => <ImageZoom alt="Test artwork" height={600} src="https://example.com/artwork.jpg" width={800} />)
    ).not.toThrow();
  });

  it("installs modal side effects only while zoomed", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1)
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const screen = render(() => <ImageZoom alt="Test artwork" height={600} src="https://example.com/artwork.jpg" width={800} />);

    fireEvent.click(screen.getByRole("img", { name: "Zoomer" }));

    expect(screen.getByRole("button", { name: "Fermer" })).toBe(document.activeElement);
    expect(addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(document.body.style.overflow).toBe("");
  });
});
