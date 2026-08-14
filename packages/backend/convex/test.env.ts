import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("APP_SITE_URL", "https://app.example.com");
  vi.stubEnv("FACEBOOK_CLIENT_ID", "test-facebook-client-id");
  vi.stubEnv("FACEBOOK_CLIENT_SECRET", "test-facebook-client-secret");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-google-client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
  vi.stubEnv("TWITTER_CLIENT_ID", "test-twitter-client-id");
  vi.stubEnv("TWITTER_CLIENT_SECRET", "test-twitter-client-secret");
});
