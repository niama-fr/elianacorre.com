// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const ANONYMIZED_EMAIL_SUFFIX = "@anonymized.invalid";

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
export const anonymizedEmailFor = (profileId: string) => `expired-${profileId}${ANONYMIZED_EMAIL_SUFFIX}`;

export const isAnonymizedEmail = (email: string) => email.endsWith(ANONYMIZED_EMAIL_SUFFIX);
