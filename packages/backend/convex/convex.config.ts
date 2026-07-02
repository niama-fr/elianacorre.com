import betterAuth from "@convex-dev/better-auth/convex.config";
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

export default app;
