import { Loops } from "@devwithbobby/loops";
import { getLink } from "@ec/domain/helpers/utils";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import type { Profiles } from "@ec/domain/schemas/profiles";

import { components } from "./convex/_generated/api";
import { env, type ActionCtx } from "./convex/_generated/server";

// CLIENT ----------------------------------------------------------------------------------------------------------------------------------
const loops = new Loops(components.loops);

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
const syncContact = async (ctx: ActionCtx, { profile: { email, firstName, lastName, _id: userId }, task }: SyncContactOpts) =>
  task.subscribed
    ? await loops.addContact(ctx, {
        email,
        firstName,
        lastName,
        source: "elianacorre.com",
        subscribed: true,
        userGroup: "newsletter",
        userId,
      })
    : await loops.unsubscribeContact(ctx, email);
type SyncContactOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SyncContactDoc"] };

const sendConfirmationEmail = async (ctx: ActionCtx, { profile, task }: SendConfirmationEmailOpts) =>
  await loops.sendTransactional(ctx, {
    dataVariables: {
      confirmationUrl: getLink({ base: env.SITE_URL, path: "/newsletter/confirmation", token: task.linkToken }),
      firstName: profile.firstName,
    },
    email: profile.email,
    idempotencyKey: task.idempotencyKey,
    transactionalId: env.LOOPS_CONFIRMATION_TRANSACTIONAL_ID,
  });
type SendConfirmationEmailOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SendConfirmationEmailDoc"] };

const sendEbookEmail = async (ctx: ActionCtx, { profile, task }: SendEbookEmailOpts) =>
  await loops.sendTransactional(ctx, {
    dataVariables: {
      downloadUrl: getLink({ base: env.SITE_URL, path: "/newsletter/ebook", token: task.linkToken }),
      firstName: profile.firstName,
    },
    email: profile.email,
    idempotencyKey: task.idempotencyKey,
    transactionalId: env.LOOPS_EBOOK_TRANSACTIONAL_ID,
  });
type SendEbookEmailOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SendEbookEmailDoc"] };

// EXECUTE ---------------------------------------------------------------------------------------------------------------------------------
export const executeTask = async (ctx: ActionCtx, { profile, task }: ExecuteTaskOpts) => {
  if (task.kind === "syncContact") await syncContact(ctx, { profile, task });
  else if (task.kind === "sendConfirmationEmail") await sendConfirmationEmail(ctx, { profile, task });
  else if (task.kind === "sendEbookEmail") await sendEbookEmail(ctx, { profile, task });
};
type ExecuteTaskOpts = { profile: Profiles["Doc"]; task: LoopsTasks["Doc"] };
