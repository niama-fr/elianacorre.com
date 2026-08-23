import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { components } from "../../convex/_generated/api";
import { createBackend } from "./test.auth";

const APP_ORIGIN = "https://app.example.com";
const AUTH_SECRET = "test-better-auth-secret-at-least-32-bytes";
const SESSION_COOKIE_NAME = "__Secure-better-auth.session_token";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const zAuthResponse = z.object({ url: z.url() });
const zAuthUser = z.object({ _id: z.string(), email: z.email() });
const zAuthSession = z.object({ _id: z.string(), token: z.string(), updatedAt: z.number() });

type Backend = ReturnType<typeof createBackend>;

const createSignedSessionCookie = async (token: string): Promise<string> => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(AUTH_SECRET), { hash: "SHA-256", name: "HMAC" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  const signatureBase64 = btoa(String.fromCodePoint(...new Uint8Array(signature)));
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(`${token}.${signatureBase64}`)}`;
};

const createPersistedSession = async (backend: Backend, expiresAt: number, updatedAt: number) => {
  const user = zAuthUser.parse(
    await backend.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: updatedAt, email: "admin@example.com", emailVerified: true, name: "Admin", updatedAt },
        model: "user",
      },
    })
  );
  const session = zAuthSession.parse(
    await backend.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: updatedAt, expiresAt, token: "persisted-session", updatedAt, userId: user._id },
        model: "session",
      },
    })
  );
  return { cookie: await createSignedSessionCookie(session.token), session, user };
};

const findSession = async (backend: Backend, sessionId: string): Promise<unknown> => {
  const session: unknown = await backend.query(components.betterAuth.adapter.findOne, {
    model: "session",
    where: [{ field: "_id", value: sessionId }],
  });
  return session;
};

describe("Better Auth HTTP boundary", () => {
  beforeEach(() => {
    vi.stubEnv("APP_SITE_URL", APP_ORIGIN);
    vi.stubEnv("BETTER_AUTH_SECRET", AUTH_SECRET);
    vi.stubEnv("FACEBOOK_CLIENT_ID", "test-facebook-client-id");
    vi.stubEnv("FACEBOOK_CLIENT_SECRET", "test-facebook-client-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
    vi.stubEnv("SITE_URL", "https://www.example.com");
    vi.stubEnv("TWITTER_CLIENT_ID", "test-twitter-client-id");
    vi.stubEnv("TWITTER_CLIENT_SECRET", "test-twitter-client-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs out from the authenticated origin, clears the cookie, and deletes the session", async () => {
    const backend = createBackend();
    const now = Date.now();
    const { cookie, session } = await createPersistedSession(backend, now + ONE_DAY_MS, now);
    const response = await backend.fetch("/api/auth/sign-out", {
      headers: { Cookie: cookie, Origin: APP_ORIGIN },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE_NAME}=;`);
    await expect(findSession(backend, session._id)).resolves.toBeNull();
  });

  it.each([
    ["facebook", "https://www.facebook.com", `${APP_ORIGIN}/api/auth/callback/facebook`],
    ["google", "https://accounts.google.com", `${APP_ORIGIN}/api/auth/callback/google`],
    ["twitter", "https://x.com", `${APP_ORIGIN}/api/auth/callback/twitter`],
  ] as const)("builds the %s callback on the authenticated application origin", async (provider, authorizationOrigin, redirectURI) => {
    const response = await createBackend().fetch("/api/auth/sign-in/social", {
      body: JSON.stringify({ callbackURL: "/ebooks", provider }),
      headers: { "Content-Type": "application/json", Origin: APP_ORIGIN },
      method: "POST",
    });

    expect(response.status).toBe(200);
    const body = zAuthResponse.parse(await response.json());
    const authorizationUrl = new URL(body.url);
    expect(authorizationUrl.origin).toBe(authorizationOrigin);
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(redirectURI);
  });

  it.each(["facebook", "google", "twitter"] as const)("rejects a cross-origin intended destination for %s", async (provider) => {
    const response = await createBackend().fetch("/api/auth/sign-in/social", {
      body: JSON.stringify({ callbackURL: "https://attacker.example", provider }),
      headers: { "Content-Type": "application/json", Origin: APP_ORIGIN },
      method: "POST",
    });

    expect(response.status).toBe(403);
  });

  it("does not expose routine magic-link authentication", async () => {
    const response = await createBackend().fetch("/api/auth/sign-in/magic-link", {
      body: JSON.stringify({ email: "member@example.com" }),
      headers: { "Content-Type": "application/json", Origin: APP_ORIGIN },
      method: "POST",
    });

    expect(response.status).toBe(404);
  });

  it("accepts a valid session cookie and refreshes a stale active session", async () => {
    const backend = createBackend();
    const now = Date.now();
    const staleUpdatedAt = now - 2 * ONE_DAY_MS;
    const { cookie, session, user } = await createPersistedSession(backend, now + ONE_DAY_MS, staleUpdatedAt);
    const response = await backend.fetch("/api/auth/get-session", { headers: { Cookie: cookie } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ user: { email: user.email } });
    const refreshedSession = zAuthSession.parse(await findSession(backend, session._id));
    expect(refreshedSession.updatedAt).toBeGreaterThan(staleUpdatedAt);
  });

  it("rejects a correctly signed persisted session after it expires", async () => {
    const backend = createBackend();
    const now = Date.now();
    const { cookie } = await createPersistedSession(backend, now - 1, now - ONE_DAY_MS);
    const response = await backend.fetch("/api/auth/get-session", { headers: { Cookie: cookie } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });
});
