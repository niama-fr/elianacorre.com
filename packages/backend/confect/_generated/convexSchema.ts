import { defineSchema as $defineSchema } from "convex/server";

import contactRequests from "./tables/contactRequests";
import ebookDownloads from "./tables/ebookDownloads";
import ebookIssuances from "./tables/ebookIssuances";
import ebooks from "./tables/ebooks";
import identities from "./tables/identities";
import legalTexts from "./tables/legalTexts";
import loopsTasks from "./tables/loopsTasks";
import loopsWebhooks from "./tables/loopsWebhooks";
import newsConfirmations from "./tables/newsConfirmations";
import newsRestrictions from "./tables/newsRestrictions";
import newsSubscriptions from "./tables/newsSubscriptions";
import newsSuppressions from "./tables/newsSuppressions";
import privacyAudits from "./tables/privacyAudits";
import privacyGrants from "./tables/privacyGrants";
import profiles from "./tables/profiles";
import retentionRuns from "./tables/retentionRuns";
import travelPacks from "./tables/travelPacks";

export default $defineSchema({
  contactRequests: contactRequests.tableDefinition,
  ebookDownloads: ebookDownloads.tableDefinition,
  ebookIssuances: ebookIssuances.tableDefinition,
  ebooks: ebooks.tableDefinition,
  identities: identities.tableDefinition,
  legalTexts: legalTexts.tableDefinition,
  loopsTasks: loopsTasks.tableDefinition,
  loopsWebhooks: loopsWebhooks.tableDefinition,
  newsConfirmations: newsConfirmations.tableDefinition,
  newsRestrictions: newsRestrictions.tableDefinition,
  newsSubscriptions: newsSubscriptions.tableDefinition,
  newsSuppressions: newsSuppressions.tableDefinition,
  privacyAudits: privacyAudits.tableDefinition,
  privacyGrants: privacyGrants.tableDefinition,
  profiles: profiles.tableDefinition,
  retentionRuns: retentionRuns.tableDefinition,
  travelPacks: travelPacks.tableDefinition,
});
