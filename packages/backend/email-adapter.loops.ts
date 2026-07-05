import { Loops } from "@devwithbobby/loops";
import { getLink } from "@ec/domain/helpers/utils";
import type { EmailJobs } from "@ec/domain/schemas/email-jobs";
import type { Profiles } from "@ec/domain/schemas/profiles";

import { components } from "./convex/_generated/api";
import type { Id } from "./convex/_generated/dataModel";
import { env, type ActionCtx } from "./convex/_generated/server";

// OPTIONS ---------------------------------------------------------------------------------------------------------------------------------
const getDataVariables = (job: Pick<EmailJobs["Doc"], "kind" | "linkToken">, { firstName }: Pick<Profiles["Doc"], "firstName">) => {
  if (job.kind === "confirmation")
    return { confirmationUrl: getLink({ base: env.SITE_URL, path: "/newsletter/confirmation", token: job.linkToken }), firstName };
  if (job.kind === "ebook")
    return { downloadUrl: getLink({ base: env.SITE_URL, path: "/newsletter/ebook", token: job.linkToken }), firstName };
  throw new Error("UNKNOWN_EMAIL_JOB_KIND");
};

const getTransactionalId = (job: Pick<EmailJobs["Doc"], "kind">) => {
  if (job.kind === "confirmation") return env.LOOPS_CONFIRMATION_TRANSACTIONAL_ID;
  if (job.kind === "ebook") return env.LOOPS_EBOOK_TRANSACTIONAL_ID;
  throw new Error(`UNKNOWN_EMAIL_JOB_KIND`);
};

// ADAPTER ---------------------------------------------------------------------------------------------------------------------------------
const loops = new Loops(components.loops);

export const emailAdapter = {
  sendTransactional: async (
    ctx: ActionCtx,
    job: Pick<EmailJobs["Doc"], "idempotencyKey" | "kind" | "linkToken">,
    profile: Pick<Profiles["Doc"], "email" | "firstName">
  ): Promise<void> => {
    await loops.sendTransactional(ctx, {
      dataVariables: getDataVariables(job, profile),
      email: profile.email,
      idempotencyKey: job.idempotencyKey,
      transactionalId: getTransactionalId(job),
    });
  },
  syncNewsletterContact: async (ctx: ActionCtx, profile: NewsletterContactProjection): Promise<void> => {
    await loops.addContact(ctx, {
      email: profile.email,
      ...(profile.firstName === undefined ? {} : { firstName: profile.firstName }),
      ...(profile.lastName === undefined ? {} : { lastName: profile.lastName }),
      source: "elianacorre.com",
      subscribed: true,
      userGroup: "newsletter",
      userId: profile.profileId,
    });
  },
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type NewsletterContactProjection = {
  email: string;
  firstName?: string;
  lastName?: string;
  profileId: Id<"profiles">;
};
