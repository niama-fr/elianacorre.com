import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { normalizeProfileEmail } from "./profiles";

// LEGAL COPY ------------------------------------------------------------------------------------------------------------------------------
export const zLegalDocumentType = z.literal(["newsletter-consent", "privacy-notice"]);

export const zInitialNewsletterLegalDocument = z.object({
  content: z.string().min(1),
  type: zLegalDocumentType,
});

const defineInitialLegalDocument = <T extends z.infer<typeof zInitialNewsletterLegalDocument>>(document: T): Readonly<T> =>
  Object.freeze(zInitialNewsletterLegalDocument.parse(document) as T);

const NEWSLETTER_CONSENT_INITIAL = defineInitialLegalDocument({
  content:
    "Je souhaite recevoir par e-mail la lettre d’Eliana Corré. Je pourrai retirer mon consentement à tout moment grâce au lien de désinscription présent dans chaque lettre.",
  type: "newsletter-consent",
});

const NEWSLETTER_PRIVACY_INITIAL = defineInitialLegalDocument({
  content: `Responsable du traitement

Eliana Corré
1A rue Gérard de Nerval
97430 Trois Mares — La Réunion
confidentialite@elianacorre.com

Données traitées

Nous traitons votre adresse e-mail, votre prénom lorsque vous choisissez de le communiquer, les informations relatives à votre consentement ainsi que les données techniques nécessaires à la confirmation, à l’envoi des messages et à la délivrance de l’e-book.

Finalités et base légale

Ces données sont utilisées pour vérifier votre adresse, gérer votre inscription, vous envoyer la lettre d’Eliana Corré, délivrer l’e-book de bienvenue et conserver la preuve de votre consentement. L’envoi de la lettre repose sur votre consentement.

Destinataires

Les données sont accessibles uniquement à Eliana Corré, aux personnes habilitées et aux prestataires nécessaires au fonctionnement du service, notamment Convex pour l’hébergement des données, Loops pour l’envoi des e-mails et Cloudflare pour l’hébergement et la protection du site. Elles ne sont ni vendues ni transmises à des partenaires publicitaires.

Durées de conservation

Les demandes non confirmées sont supprimées après 30 jours. Les données d’envoi et de téléchargement détaillées sont conservées pendant 90 jours. Les données d’un ancien abonné sont conservées au maximum trois ans après sa désinscription ou son dernier contact pertinent. Une information minimale peut être conservée plus longtemps lorsqu’elle est nécessaire pour respecter une opposition.

Mesure d’audience

L’ouverture des e-mails n’est pas suivie. Les clics ne sont pas suivis dans cette première version.

Vos droits

Vous pouvez retirer votre consentement à tout moment grâce au lien de désinscription présent dans chaque lettre. Vous pouvez également demander l’accès, la rectification, l’effacement ou la limitation de vos données, ou vous opposer à certains traitements, en écrivant à confidentialite@elianacorre.com.

Vous pouvez introduire une réclamation auprès de la CNIL.

Transferts internationaux

Certains prestataires peuvent traiter des données hors de l’Espace économique européen. Lorsque cela se produit, ces transferts doivent être encadrés par un mécanisme reconnu par le RGPD.`,
  type: "privacy-notice",
});

export const CURRENT_NEWSLETTER_LEGAL_COPY = Object.freeze({
  consent: Object.freeze({ ...NEWSLETTER_CONSENT_INITIAL, text: NEWSLETTER_CONSENT_INITIAL.content }),
  privacy: Object.freeze({ ...NEWSLETTER_PRIVACY_INITIAL, text: NEWSLETTER_PRIVACY_INITIAL.content }),
});

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterEmailKind = z.literal(["confirmation", "ebook-delivery"]);
export const zNewsletterEmailStatus = z.literal(["failed", "pending", "sending", "sent"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zLegalDocumentFields = z.object({
  content: z.string().min(1),
  publishedAt: z.number().nullable(),
  publishedBy: zid("profiles").nullable(),
  type: zLegalDocumentType,
});

export const zNewsletterLegalBundleFields = z.object({
  consentDocumentId: zid("legalDocuments"),
  privacyDocumentId: zid("legalDocuments"),
  publishedAt: z.number().nullable(),
  publishedBy: zid("profiles").nullable(),
});

export const zNewsletterSubscriptionFields = z.object({
  confirmationTokenHash: z.string().nullable(),
  confirmedAt: z.number().nullable(),
  legalBundleId: zid("newsletterLegalBundles"),
  profileId: zid("profiles"),
  requestedAt: z.number(),
  unsubscribedAt: z.number().nullable(),
});

export const zEbookDownloadCapabilityFields = z.object({
  issuedAt: z.number(),
  profileId: zid("profiles"),
  tokenHash: z.string(),
});

export const zNewsletterEmailOutboxFields = z.object({
  attempts: z.int().nonnegative(),
  idempotencyKey: z.string(),
  kind: zNewsletterEmailKind,
  lastError: z.string().nullable(),
  leaseExpiresAt: z.number().nullable(),
  linkToken: z.string(),
  nextAttemptAt: z.number(),
  profileId: zid("profiles"),
  sentAt: z.number().nullable(),
  status: zNewsletterEmailStatus,
});

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterSubscriptionValues = z.object({
  consent: z.literal(true, { error: "Vous devez accepter de recevoir la lettre" }),
  email: z.string().trim().pipe(z.email("Ce champ doit être un courriel valide")),
  firstName: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).optional()
  ),
});

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterSubscription = z.object({
  email: z.email(),
  firstName: z.string().optional(),
});

// PARSING ---------------------------------------------------------------------------------------------------------------------------------
export const parseNewsletterSubscription = (
  values: z.input<typeof zNewsletterSubscriptionValues>
): z.infer<typeof zNewsletterSubscription> => {
  const { consent: _consent, email, firstName, ...subscription } = zNewsletterSubscriptionValues.parse(values);
  return zNewsletterSubscription.parse({
    ...subscription,
    email: normalizeProfileEmail(email),
    ...(firstName === undefined ? {} : { firstName }),
  });
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsletterSubscription = z.infer<typeof zNewsletterSubscription>;
