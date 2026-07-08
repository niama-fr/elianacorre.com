import betterAuth from "@convex-dev/better-auth/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import loops from "@devwithbobby/loops/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

// APP -------------------------------------------------------------------------------------------------------------------------------------
const app = defineApp({
  env: {
    BETTER_AUTH_SECRET: v.string(),
    GOOGLE_CLIENT_ID: v.string(),
    GOOGLE_CLIENT_SECRET: v.string(),
    LOOPS_API_KEY: v.string(),
    LOOPS_CONFIRMATION_TRANSACTIONAL_ID: v.string(),
    LOOPS_EBOOK_TRANSACTIONAL_ID: v.string(),
    SITE_URL: v.string(),
    WHITELIST_SEED: v.string(),
  },
});
app.use(betterAuth);
app.use(rateLimiter);
app.use(loops);
app.use(workflow);

export default app;
