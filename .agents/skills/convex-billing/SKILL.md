---
name: convex-billing
description: "Add Stripe billing/payments to the Convex app via @convex-dev/stripe (checkout + webhook + gating)."
---

<!-- GENERATED from convex-agents content/capabilities/billing.json — do not edit by hand. -->

# Add billing / payments

Wire Stripe to Convex using @convex-dev/stripe: a checkout action, an httpAction webhook registered by the component (signature-verified automatically), subscription state stored in the component's tables, and server-side gating via a query.

## Repository authority boundary

This skill may prepare billing code and perform local verification without additional authority.

Any mutation of external Convex or Stripe state requires explicit delegation.

For Convex operations:

- prefer local anonymous verification;
- before any remote dev, preview, or production mutation, follow `convex-deploy-guard`;
- do not write remote Convex environment variables unless explicitly delegated.

For Stripe operations, explicit delegation is required before:

- creating or changing products or prices;
- creating, updating, or deleting webhook endpoints;
- changing customer, subscription, invoice, or payment state;
- writing secrets or configuration into Stripe or another remote system.

If remote setup has not been delegated, prepare the required code and provide the exact remaining human setup steps instead.

## Workflow

1. Install the component: `npm install @convex-dev/stripe`.
2. Create `convex/convex.config.ts`:
   ```ts
   import { defineApp } from 'convex/server';
   import stripe from '@convex-dev/stripe/convex.config.js';
   const app = defineApp();
   app.use(stripe);
   export default app;
   ```
3. Determine the required Convex environment variables: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Do not write them to a remote Convex deployment unless explicitly delegated and `convex-deploy-guard` permits the target. Otherwise document the required values for human setup.
4. Create `convex/http.ts` to register the webhook route (the component handles signature verification automatically):
   ```ts
   import { httpRouter } from 'convex/server';
   import { components } from './_generated/api';
   import { registerRoutes } from '@convex-dev/stripe';
   const http = httpRouter();
   registerRoutes(http, components.stripe, { webhookPath: '/stripe/webhook' });
   export default http;
   ```
5. Create `convex/billing.ts` with a checkout action and a subscription-gate query:
   ```ts
   import { action, query } from './_generated/server';
   import { components } from './_generated/api';
   import { StripeSubscriptions } from '@convex-dev/stripe';
   import { v } from 'convex/values';
   const stripeClient = new StripeSubscriptions(components.stripe, {});
   export const createSubscriptionCheckout = action({
     args: { priceId: v.string() },
     returns: v.object({ sessionId: v.string(), url: v.union(v.string(), v.null()) }),
     handler: async (ctx, args) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error('Not authenticated');
       const customer = await stripeClient.getOrCreateCustomer(ctx, { userId: identity.subject, email: identity.email, name: identity.name });
       return await stripeClient.createCheckoutSession(ctx, { priceId: args.priceId, customerId: customer.customerId, mode: 'subscription', successUrl: `${process.env.SITE_URL ?? 'http://localhost:3000'}/?success=true`, cancelUrl: `${process.env.SITE_URL ?? 'http://localhost:3000'}/?canceled=true`, subscriptionMetadata: { userId: identity.subject } });
     },
   });
   export const isSubscribed = query({
     args: {},
     returns: v.boolean(),
     handler: async (ctx) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) return false;
       const subscriptions = await ctx.runQuery(components.stripe.public.listSubscriptionsByUserId, { userId: identity.subject });
       return subscriptions.some((sub) => sub.status === 'active' || sub.status === 'trialing');
     },
   });
   ```
6. Perform local Convex validation. Prefer:

   `CONVEX_AGENT_MODE=anonymous npx convex dev --once`

   Fix component installation, codegen, schema, or function errors locally. Do not use a configured remote deployment merely to complete verification.
7. The Stripe webhook must ultimately target `https://<deployment>.convex.site/stripe/webhook` and subscribe to the required events. Creating or changing that webhook in Stripe is a remote mutation and requires explicit delegation. Without that delegation, provide the exact webhook configuration for the human to apply.

## Rules

- Use @convex-dev/stripe (npm: @convex-dev/stripe@^0.1.4) — it handles webhook signature verification internally via registerRoutes; do NOT write a manual constructEvent webhook.
- Stripe keys live in Convex env (use the `env` micro power): STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
- Gate on server-stored subscription state via isSubscribed query (reads component tables), not client claims.
- convex/convex.config.ts must import from '@convex-dev/stripe/convex.config.js' (not .ts) — the .js extension is required by the Convex bundler.
