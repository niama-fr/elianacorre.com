const DEFAULT_AUTH_REDIRECT = "/";
const AUTH_REDIRECT_ORIGIN = "https://authenticated.invalid";

export const getSafeAuthRedirect = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_AUTH_REDIRECT;

  try {
    const redirect = new URL(value, AUTH_REDIRECT_ORIGIN);
    if (redirect.origin !== AUTH_REDIRECT_ORIGIN) return DEFAULT_AUTH_REDIRECT;
    return `${redirect.pathname}${redirect.search}${redirect.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
};
