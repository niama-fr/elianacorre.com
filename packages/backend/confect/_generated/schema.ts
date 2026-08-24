import { DatabaseSchema as $DatabaseSchema } from "@confect/server";

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

const databaseSchema: $DatabaseSchema.DatabaseSchema<
  typeof contactRequests |
  typeof ebookDownloads |
  typeof ebookIssuances |
  typeof ebooks |
  typeof identities |
  typeof legalTexts |
  typeof loopsTasks |
  typeof loopsWebhooks |
  typeof newsConfirmations |
  typeof newsRestrictions |
  typeof newsSubscriptions |
  typeof newsSuppressions |
  typeof privacyAudits |
  typeof privacyGrants |
  typeof profiles |
  typeof retentionRuns |
  typeof travelPacks
> = $DatabaseSchema.make({
  contactRequests,
  ebookDownloads,
  ebookIssuances,
  ebooks,
  identities,
  legalTexts,
  loopsTasks,
  loopsWebhooks,
  newsConfirmations,
  newsRestrictions,
  newsSubscriptions,
  newsSuppressions,
  privacyAudits,
  privacyGrants,
  profiles,
  retentionRuns,
  travelPacks,
});

export default databaseSchema;
