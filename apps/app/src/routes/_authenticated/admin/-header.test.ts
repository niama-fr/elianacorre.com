import { describe, expect, it } from "vitest";

import { getAdminHeaderDisplay } from "./-header";

describe(getAdminHeaderDisplay, () => {
  it("uses refreshed edit-route loader data for the current breadcrumb title", () => {
    expect(
      getAdminHeaderDisplay([
        {
          loaderData: { title: "Tokyo : mes bonnes adresses" },
          routeId: "/_authenticated/admin/packs/$packId",
        },
      ])
    ).toStrictEqual({
      currentTitle: "Tokyo : mes bonnes adresses",
      section: "travelPacks",
      showTravelPackCreate: false,
    });
  });

  it("keeps the contextual create action on the collection route", () => {
    expect(getAdminHeaderDisplay([{ routeId: "/_authenticated/admin/packs/" }])).toStrictEqual({
      currentTitle: undefined,
      section: "travelPacks",
      showTravelPackCreate: true,
    });
  });
});
