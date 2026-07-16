import { describe, expect, it } from "vitest";

import { calendarYearsBefore } from "./datetime";

describe(calendarYearsBefore, () => {
  it("preserves the UTC calendar date and time in an ordinary year", () => {
    const timestamp = Date.UTC(2026, 6, 16, 13, 42, 17, 321);

    expect(calendarYearsBefore(timestamp, 3)).toBe(Date.UTC(2023, 6, 16, 13, 42, 17, 321));
  });

  it("clamps leap day to the last day of February", () => {
    const leapDay = Date.UTC(2024, 1, 29, 23, 59, 58, 987);

    expect(calendarYearsBefore(leapDay, 3)).toBe(Date.UTC(2021, 1, 28, 23, 59, 58, 987));
  });
});
