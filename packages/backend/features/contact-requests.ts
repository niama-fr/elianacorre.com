import { MINUTE } from "@convex-dev/rate-limiter";
import type { ContactRequests } from "@ec/domain/schemas/contact-requests";
import type { Profiles } from "@ec/domain/schemas/profiles";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Effect as E, Option as O } from "effect";

import { createContactRequest, getLatestProfileContactRequest } from "../data/contact-requests";
import { ensureContactProfileId, getProfileIdByEmail } from "../data/profiles";
import { HoneypotTriggered } from "../infra/anti-abuse";
import { makeRateLimiter } from "../infra/rate-limiter";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 15 * MINUTE;
const DEDUP_WINDOW_MS = 15 * MINUTE;

const rateLimiter = makeRateLimiter({
  contactRequestByEmail: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 3 },
  contactRequestByIp: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 5 },
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const submitContactRequest = E.fn(function* ({ email, firstName, message, now, requestIp, website }: SubmitOpts) {
  if (website !== "") return yield* new HoneypotTriggered();

  yield* rateLimiter.limit("contactRequestByIp", requestIp);

  const existingProfileId = yield* getProfileIdByEmail(email);
  if (O.isSome(existingProfileId)) {
    const latest = yield* getLatestProfileContactRequest(existingProfileId.value);
    if (O.isSome(latest) && latest.value.message === message && latest.value._creationTime >= now - DEDUP_WINDOW_MS) return;
  }

  yield* rateLimiter.limit("contactRequestByEmail", email);

  const profileId = yield* ensureContactProfileId({ email, firstName });
  yield* createContactRequest({ message, profileId });
});

type SubmitOpts = WithNow<
  Pick<ContactRequests["Create"], "message"> & Pick<Profiles["Create"], "email" | "firstName"> & { requestIp: string; website: string }
>;
