import { requireActivePrivacyNotice as requireActivePrivacyNoticeLegalText } from "../data/legal-texts";
import { zQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const requireActivePrivacyNotice = zQuery({
  args: {},
  handler: async (ctx) => await requireActivePrivacyNoticeLegalText(ctx),
});
