import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

// HTTP ------------------------------------------------------------------------------------------------------------------------------------
const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

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
