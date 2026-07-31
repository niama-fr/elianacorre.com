import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RoutePendingPage } from "./-pending";
import { SafeRouteErrorPage } from "./-safe-error";

describe("authenticated route states", () => {
  it("announces pending route data accessibly", () => {
    const markup = renderToStaticMarkup(<RoutePendingPage />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Chargement");
  });

  it("renders a safe route error without implementation details", () => {
    const markup = renderToStaticMarkup(<SafeRouteErrorPage />);

    expect(markup.match(/role="alert"/gu)).toHaveLength(1);
    expect(markup).toContain("Impossible de charger cette page");
    expect(markup).toContain("Réessayez. Si le problème persiste, reconnectez-vous.");
  });
});
