import type { LegalTexts } from "@ec/domain/schemas/legal-texts";

export const NEWSLETTER_CONSENT: LegalTexts["Create"] = {
  content:
    "Je souhaite recevoir par e-mail la lettre d’Eliana Corré. Je pourrai retirer mon consentement à tout moment grâce au lien de désinscription présent dans chaque lettre.",
  kind: "newsletterConsent",
};

export const PRIVACY_NOTICE: LegalTexts["Create"] = {
  content: `## Responsable du traitement

- **Eliana Corré**
- 107 chemin de ligne, Les Canots
- 97427 Étang-Salé — La Réunion, France
- [contact@elianacorre.com](mailto:contact@elianacorre.com)
- [+262 (0)692 90 47 62](tel:+262692904762)

## Données traitées

Lorsque vous utilisez le formulaire de contact, nous traitons votre prénom, votre adresse e-mail et le contenu de votre message.

Lorsque vous vous inscrivez à la lettre, nous traitons votre adresse e-mail, votre prénom lorsque vous choisissez de le communiquer, les informations relatives à votre consentement ainsi que les données techniques nécessaires à la confirmation, à l’envoi des messages et à la délivrance de l’e-book.

## Finalités et base légale

Les données du formulaire de contact sont utilisées pour recevoir votre demande, y répondre et en assurer le suivi. Ce traitement repose sur l’intérêt légitime d’Eliana Corré à répondre aux personnes qui la contactent.

Les données de la lettre sont utilisées pour vérifier votre adresse, gérer votre inscription, vous envoyer la lettre d’Eliana Corré, délivrer l’e-book de bienvenue et conserver la preuve de votre consentement. Une réinscription explicite depuis le centre de préférences d’un e-mail est enregistrée comme une nouvelle période de consentement. L’envoi de la lettre repose sur votre consentement.

## Destinataires

Les données sont accessibles uniquement à Eliana Corré, aux personnes habilitées et aux prestataires nécessaires au fonctionnement du service :

- Convex pour l’hébergement des données et les traitements applicatifs ;
- Loops pour la gestion des contacts et l’envoi des e-mails ;
- Cloudflare pour l’hébergement, la protection du site, le DNS et le routage de contact@elianacorre.com ;
- Google pour la réception des messages adressés à cette boîte.

Elles ne sont ni vendues ni transmises à des partenaires publicitaires.

## Durées de conservation

Les demandes de contact sont conservées pendant le temps nécessaire à leur traitement et à leur suivi, dans la limite de douze mois à compter de leur réception.

Les demandes d’inscription à la lettre non confirmées sont supprimées après 30 jours. Les données d’envoi et de téléchargement détaillées sont conservées pendant 90 jours. Les données d’un ancien abonné sont conservées au maximum trois ans après sa désinscription ou son dernier contact pertinent. Une information minimale peut être conservée plus longtemps lorsqu’elle est nécessaire pour respecter une opposition.

## Mesure d’audience

L’ouverture des e-mails n’est pas suivie. Les clics ne sont pas suivis dans cette première version.

## Vos droits

Vous pouvez retirer votre consentement à tout moment grâce au lien de désinscription présent dans chaque lettre. Vous pouvez également demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données, ou vous opposer à certains traitements, en écrivant à [contact@elianacorre.com](mailto:contact@elianacorre.com).

Vous pouvez introduire une réclamation auprès de la [CNIL](https://www.cnil.fr).

## Transferts internationaux

Convex n’est pas déployé dans une région européenne. Convex, Loops, Cloudflare, Google ou certains de leurs sous-traitants peuvent donc traiter des données hors de l’Espace économique européen, notamment aux États-Unis. Selon le prestataire et le pays concernés, ces transferts reposent sur une décision d’adéquation, notamment le cadre de protection des données UE–États-Unis lorsque le destinataire est certifié, ou sur les clauses contractuelles types approuvées par la Commission européenne, complétées si nécessaire par des garanties supplémentaires. Vous pouvez demander des informations complémentaires à [contact@elianacorre.com](mailto:contact@elianacorre.com).`,
  kind: "privacyNotice",
};
