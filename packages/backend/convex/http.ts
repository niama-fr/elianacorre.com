import { zLoopsWebhookValues } from "@ec/domain/schemas/loops-webhooks";
import { httpRouter } from "convex/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";

import { internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

// HTTP ------------------------------------------------------------------------------------------------------------------------------------
const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const webhookId = request.headers.get("webhook-id");
    let values: unknown;

    try {
      values = new Webhook(env.LOOPS_WEBHOOK_SECRET).verify(body, Object.fromEntries(request.headers.entries()));
    } catch (error) {
      if (error instanceof WebhookVerificationError) return new Response("Unauthorized", { status: 401 });
      if (error instanceof SyntaxError) return new Response("Bad request", { status: 400 });
      throw error;
    }

    if (typeof values !== "object" || !values) return new Response("Bad request", { status: 400 });
    const parsed = zLoopsWebhookValues.safeParse({ ...values, webhookId });
    if (!parsed.success) return new Response("Bad request", { status: 400 });

    await ctx.runMutation(internal.loops.processWebhook, parsed.data);
    return new Response(null, { status: 204 });
  }),
  method: "POST",
  path: "/loops/webhook",
});

http.route({
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token");
    if (token === null) return redirectToEbookRecovery();
    const ebook = await ctx.runQuery(internal.ebooks.resolveDownload, { token });
    if (ebook === null) return redirectToEbookRecovery();
    const file = await ctx.storage.get(ebook.storageId);
    if (file === null) return redirectToEbookRecovery();
    const fileName = ebook.fileName.replaceAll('"', "");
    return new Response(file, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": file.type || "application/pdf",
      },
    });
  }),
  method: "GET",
  path: "/newsletter/ebook",
});

function redirectToEbookRecovery() {
  return Response.redirect(new URL("/newsletter/ebook", env.SITE_URL), 302);
}

export default http;
