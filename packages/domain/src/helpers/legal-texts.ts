import type { LegalTexts } from "@ec/domain/schemas/legal-texts";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const NEWSLETTER_CONSENT: LegalTexts["Create"] = {
  content:
    "Je souhaite recevoir par e-mail la lettre d’Eliana Corré. Je pourrai retirer mon consentement à tout moment grâce au lien de désinscription présent dans chaque lettre.",
  kind: "newsletterConsent",
};

export const PRIVACY_NOTICE: LegalTexts["Create"] = {
  content: `Responsable du traitement

Eliana Corré
107 chemin de ligne, Les Canots
97427 Étang-Salé — La Réunion, France
contact@elianacorre.com

Données traitées

Nous traitons votre adresse e-mail, votre prénom lorsque vous choisissez de le communiquer, les informations relatives à votre consentement ainsi que les données techniques nécessaires à la confirmation, à l’envoi des messages et à la délivrance de l’e-book.

Finalités et base légale

Ces données sont utilisées pour vérifier votre adresse, gérer votre inscription, vous envoyer la lettre d’Eliana Corré, délivrer l’e-book de bienvenue et conserver la preuve de votre consentement. Une réinscription explicite depuis le centre de préférences d’un e-mail est enregistrée comme une nouvelle période de consentement. L’envoi de la lettre repose sur votre consentement.

Destinataires

Les données sont accessibles uniquement à Eliana Corré, aux personnes habilitées et aux prestataires nécessaires au fonctionnement du service : Convex pour l’hébergement des données et les traitements applicatifs, Loops pour la gestion des contacts et l’envoi des e-mails, Cloudflare pour l’hébergement, la protection du site, le DNS et le routage de contact@elianacorre.com, et Google pour la réception des messages adressés à cette boîte. Elles ne sont ni vendues ni transmises à des partenaires publicitaires.

Durées de conservation

Les demandes non confirmées sont supprimées après 30 jours. Les données d’envoi et de téléchargement détaillées sont conservées pendant 90 jours. Les données d’un ancien abonné sont conservées au maximum trois ans après sa désinscription ou son dernier contact pertinent. Une information minimale peut être conservée plus longtemps lorsqu’elle est nécessaire pour respecter une opposition.

Mesure d’audience

L’ouverture des e-mails n’est pas suivie. Les clics ne sont pas suivis dans cette première version.

Vos droits

Vous pouvez retirer votre consentement à tout moment grâce au lien de désinscription présent dans chaque lettre. Vous pouvez également demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données, ou vous opposer à certains traitements, en écrivant à contact@elianacorre.com.

Vous pouvez introduire une réclamation auprès de la CNIL.

Transferts internationaux

Certains prestataires et leurs sous-traitants peuvent traiter des données hors de l’Espace économique européen. Selon le prestataire et le pays concernés, ces transferts sont encadrés par une décision d’adéquation, des clauses contractuelles types approuvées par la Commission européenne ou une autre garantie reconnue par le RGPD. Les mécanismes effectivement applicables sont vérifiés et tenus à jour dans le registre interne des activités de traitement. Vous pouvez demander des informations complémentaires à contact@elianacorre.com.`,
  kind: "privacyNotice",
};
