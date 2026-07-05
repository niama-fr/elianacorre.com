/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as contactRequests from "../contactRequests.js";
import type * as ebooks from "../ebooks.js";
import type * as emailProviderJobs from "../emailProviderJobs.js";
import type * as emailProviderRunner from "../emailProviderRunner.js";
import type * as http from "../http.js";
import type * as newsletterLegalBundles from "../newsletterLegalBundles.js";
import type * as newsletterSubs from "../newsletterSubs.js";
import type * as seed from "../seed.js";
import type * as zod from "../zod.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  contactRequests: typeof contactRequests;
  ebooks: typeof ebooks;
  emailProviderJobs: typeof emailProviderJobs;
  emailProviderRunner: typeof emailProviderRunner;
  http: typeof http;
  newsletterLegalBundles: typeof newsletterLegalBundles;
  newsletterSubs: typeof newsletterSubs;
  seed: typeof seed;
  zod: typeof zod;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  loops: import("@devwithbobby/loops/_generated/component.js").ComponentApi<"loops">;
};
