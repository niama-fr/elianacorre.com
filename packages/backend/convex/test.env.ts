import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("APP_SITE_URL", "https://app.example.com");
});
