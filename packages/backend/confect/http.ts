import { HttpRouter as ConfectHttpRouter } from "@confect/server";
import { sLoopsWebhookValues } from "@ec/domain/schemas/loops-webhooks";
import { Config, Effect as E, Layer as L, Option as O, Result as R, Schema as S } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { Webhook, WebhookVerificationError } from "standardwebhooks";

import { authComponent, createAuth } from "../runtime/better-auth";
import refs from "./_generated/refs";
import { MutationRunner, QueryRunner, StorageActionWriter } from "./_generated/services";

// ROUTES ----------------------------------------------------------------------------------------------------------------------------------
const loopsWebhookRoute = HttpRouter.add("POST", "/loops/webhook", (request) =>
  E.gen(function* () {
    const secret = yield* Config.string("LOOPS_WEBHOOK_SECRET").pipe(E.orDie);
    const body = yield* request.text;
    const webhookId = request.headers["webhook-id"] ?? null;

    const verified = R.try({
      catch: (error) => error,
      try: () => new Webhook(secret).verify(body, { ...request.headers }),
    });

    if (R.isFailure(verified)) {
      if (verified.failure instanceof WebhookVerificationError) return HttpServerResponse.text("Unauthorized", { status: 401 });
      if (verified.failure instanceof SyntaxError) return HttpServerResponse.text("Bad request", { status: 400 });
      return yield* E.die(verified.failure);
    }

    const values = verified.success;

    if (typeof values !== "object" || values === null) return HttpServerResponse.text("Bad request", { status: 400 });

    const parsed = S.decodeUnknownOption(sLoopsWebhookValues)({ ...values, webhookId });

    if (O.isNone(parsed)) return HttpServerResponse.text("Bad request", { status: 400 });

    const runMutation = yield* MutationRunner;

    yield* runMutation(refs.internal.loops.processWebhook, parsed.value).pipe(E.orDie);

    return HttpServerResponse.empty();
  })
);

const ebookDownloadRoute = HttpRouter.add("GET", "/newsletter/ebook", (request) =>
  E.gen(function* () {
    const token = new URL(request.originalUrl).searchParams.get("token");
    if (token === null) return yield* redirectToEbookRecovery;

    const runQuery = yield* QueryRunner;
    const ebook = yield* runQuery(refs.internal.ebooks.resolveDownload, { token }).pipe(E.orDie);

    if (ebook === null) return yield* redirectToEbookRecovery;

    const storage = yield* StorageActionWriter;
    const file = yield* storage.get(ebook.storageId).pipe(E.catchTag("BlobNotFoundError", () => E.succeed(null)));

    if (file === null) return yield* redirectToEbookRecovery;

    const fileName = ebook.fileName.replaceAll('"', "");

    return HttpServerResponse.raw(file, {
      contentLength: file.size,
      contentType: file.type || "application/pdf",
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  })
);

// HTTP ------------------------------------------------------------------------------------------------------------------------------------
const http = ConfectHttpRouter.make(L.mergeAll(loopsWebhookRoute, ebookDownloadRoute));

authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
const redirectToEbookRecovery = E.gen(function* () {
  const siteUrl = yield* Config.string("SITE_URL").pipe(E.orDie);
  return HttpServerResponse.redirect(new URL("/newsletter/ebook", siteUrl), { status: 302 });
});
