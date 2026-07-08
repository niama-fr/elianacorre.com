import { httpRouter } from "convex/server";

import { verifyLoopsWebhookSignature } from "../loops-webhook-signatures";
import { parseLoopsWebhookPayload } from "../loops-webhooks";
import { internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

// HTTP ------------------------------------------------------------------------------------------------------------------------------------
const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({
  handler: httpAction(async (ctx, request) => {
    const id = request.headers.get("webhook-id");
    const signature = request.headers.get("webhook-signature");
    const timestamp = request.headers.get("webhook-timestamp");
    if (id === null || signature === null || timestamp === null) return new Response("Unauthorized", { status: 401 });
    const body = await request.text();
    const verified = await verifyLoopsWebhookSignature({ body, id, secret: env.LOOPS_WEBHOOK_SECRET, signature, timestamp });
    if (!verified) return new Response("Unauthorized", { status: 401 });

    try {
      const event = parseLoopsWebhookPayload(body, { receivedAt: Date.now(), webhookId: id });
      await ctx.runMutation(internal.loopsWebhooks.process, event);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    return new Response(null, { status: 204 });
  }),
  method: "POST",
  path: "/webhooks/loops",
});

http.route({
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token");
    if (token === null) return new Response("Not found", { status: 404 });
    const ebook = await ctx.runQuery(internal.ebooks.resolveDownload, { token });
    if (ebook === null) return new Response("Not found", { status: 404 });
    const file = await ctx.storage.get(ebook.storageId);
    if (file === null) return new Response("Not found", { status: 404 });
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

export default http;
