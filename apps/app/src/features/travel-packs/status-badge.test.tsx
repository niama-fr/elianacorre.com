// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TravelPackStatusBadge } from "./status-badge";

describe(TravelPackStatusBadge, () => {
  afterEach(cleanup);

  it.each([
    ["draft", "Brouillon"],
    ["published", "Publié"],
    ["archived", "Archivé"],
  ] as const)("renders the %s status with its French label", (status, label) => {
    render(<TravelPackStatusBadge status={status} />);

    const badge = screen.getByText(label);
    expect(badge.dataset.status).toBe(status);
  });
});
