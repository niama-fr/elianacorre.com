# Exploitation des e-mails de la newsletter

## Résultat

Ce runbook permet à un opérateur humain d’exploiter la newsletter sans dépendre d’un agent IA : séparer les environnements, gérer les secrets, configurer le domaine d’envoi et les réponses, authentifier les webhooks, préparer une campagne, diagnostiquer et relancer une tâche, réconcilier les données, publier les textes juridiques et réagir à un incident.

Il ne constitue pas une autorisation de mise en production. Grégory approuve chaque modification DNS, Loops, Convex, Cloudflare ou Google et chaque envoi réel avant son exécution. Eliana valide la présentation de l’expéditeur et le pied de page des campagnes.

## Systèmes canoniques et responsabilités

| Élément | Système canonique | Responsable |
| --- | --- | --- |
| Travail, critères et état | Linear, NIA-28 | Grégory |
| Code, runbooks, notice publiée | Git | Grégory |
| Profils, consentements, droits, tâches et restrictions | Convex | Eliana Corré, exploitation par Grégory |
| Contacts projetés et envois | Loops | Grégory |
| DNS, protection et routage de contact | Cloudflare | Grégory |
| Réponses à `contact@elianacorre.com` | `eliana.m.corre@gmail.com` via Cloudflare Email Routing | Eliana |
| Registre des traitements | Drive, dossier `elianacorre.com` | Grégory avec validation d’Eliana |

Convex reste l’autorité. Loops ne doit jamais décider du consentement, du droit à l’e-book ou de l’identité d’une personne.

## Configuration approuvée

- Expéditeur affiché : Eliana Corré.
- Adresse d’envoi : `newsletter@news.elianacorre.com`.
- Adresse publique et Reply-To : `contact@elianacorre.com`.
- Destination des réponses : `eliana.m.corre@gmail.com` via Cloudflare Email Routing.
- Adresse autorisée hors production : `gregory.bouteiller@niama.fr`.
- Suivi des ouvertures : désactivé.
- Suivi des clics : désactivé.
- Pied de page : Eliana Corré, 107 chemin de ligne, Les Canots, 97427 Étang-Salé, lien vers la notice, contact et désinscription visible.

## Sécurité commune

- Ne jamais copier de clé, secret, jeton, export nominatif ou contenu d’incident dans Git, Linear, Drive, Obsidian, un prompt ou une commande.
- Saisir les secrets uniquement dans l’interface sécurisée du fournisseur ou du déploiement ciblé.
- Vérifier le nom du projet, du déploiement et de l’environnement avant toute modification.
- Utiliser des données synthétiques hors production.
- Ne jamais exporter les contacts de production vers le développement, la prévisualisation ou le staging.
- Conserver les preuves sous forme d’identifiants, dates, résultats et captures expurgées.

## 1. Secrets et rotation

### Prérequis

- Autorisation explicite de Grégory pour l’environnement concerné.
- Accès administrateur au tableau de bord Convex et au compte Loops correspondant.
- Inventaire des variables dans `docs/agents/deployment.md`.

### Procédure

1. Ouvrir le déploiement Convex exact et relever uniquement les noms des variables, jamais leurs valeurs.
2. Créer le nouveau secret dans le gestionnaire approuvé du fournisseur.
3. Remplacer la valeur dans **Convex Dashboard → Settings → Environment Variables**.
4. Pour `LOOPS_API_KEY`, vérifier que la clé appartient à l’environnement Loops correspondant avant de l’enregistrer.
5. Pour `LOOPS_WEBHOOK_SECRET`, créer ou renouveler le secret depuis le webhook Loops de ce même environnement.
6. Déployer ou redémarrer uniquement si le fournisseur l’exige.
7. Tester avec une donnée synthétique et, hors production, uniquement avec `gregory.bouteiller@niama.fr`.
8. Révoquer l’ancien secret après validation du nouveau.
9. Enregistrer dans Linear la date, l’environnement, l’opérateur et le résultat, sans secret.

### Résultat et vérification

Le nouveau secret fonctionne, l’ancien est révoqué et aucun autre environnement n’a changé. Un appel de contrôle autorisé réussit ; une ancienne clé échoue.

### Récupération

Si la nouvelle valeur échoue, restaurer l’ancienne valeur encore valide, interrompre les envois et diagnostiquer le nom d’environnement, les droits et les espaces superflus. En cas d’exposition, révoquer immédiatement la valeur et suivre la procédure d’incident.

## 2. Isolation des environnements

### Variables

Chaque déploiement Convex définit :

- `EMAIL_DELIVERY_MODE=isolated` en développement, prévisualisation et staging ;
- `EMAIL_DELIVERY_ALLOWLIST=gregory.bouteiller@niama.fr` hors production ;
- `EMAIL_DELIVERY_MODE=production` uniquement sur le déploiement de production approuvé ;
- `EMAIL_DELIVERY_ALLOWLIST` vide ou explicitement documentée en production.

### Procédure

1. Ouvrir le déploiement Convex ciblé et confirmer son nom.
2. Vérifier que ses clés Loops et identifiants transactionnels appartiennent à un espace Loops isolé de la production.
3. Définir le mode et l’allowlist ci-dessus.
4. Vérifier que le déploiement ne contient aucun contact, export, identifiant Loops ou secret provenant de production.
5. Avec une adresse synthétique non autorisée, lancer le chemin de confirmation : il doit créer l’intention Convex mais afficher une alerte terminale sans appel Loops.
6. Avec `gregory.bouteiller@niama.fr`, répéter le test dans l’espace Loops non productif : un seul envoi doit être journalisé.

### Récupération

Si une donnée ou clé de production apparaît hors production, arrêter les fonctions d’envoi, révoquer la clé, supprimer les copies selon la procédure d’incident, conserver une preuve minimale et rétablir l’espace isolé. Ne pas « nettoyer » silencieusement l’incident.

## 3. DNS, domaine d’envoi et réponses

### Prérequis

- Autorisation explicite de Grégory.
- Valeurs DNS fournies par Loops pour `news.elianacorre.com`.
- Accès à Cloudflare DNS et Email Routing.

### Procédure

1. Exporter ou capturer l’état DNS actuel sans exposer de secret.
2. Dans Loops, lancer la configuration du domaine `news.elianacorre.com` et relever les enregistrements demandés.
3. Dans Cloudflare DNS, créer les enregistrements DKIM exactement comme fournis.
4. Pour SPF, ne jamais créer deux enregistrements SPF TXT sur le même nom. Fusionner les mécanismes autorisés dans un seul enregistrement si nécessaire.
5. Créer une politique DMARC progressive sur le nom approprié, avec rapports vers une boîte approuvée ; ne pas passer à une politique stricte avant analyse des rapports.
6. Vérifier que les MX et règles Email Routing de `elianacorre.com` continuent d’acheminer `contact@elianacorre.com` vers `eliana.m.corre@gmail.com`.
7. Dans Loops, définir `newsletter@news.elianacorre.com` comme From et `contact@elianacorre.com` comme Reply-To.
8. Attendre la propagation puis vérifier SPF, DKIM et DMARC avec les outils Loops et une inspection DNS indépendante.
9. Après autorisation d’envoi test, envoyer uniquement à l’adresse autorisée et inspecter les en-têtes `From`, `Reply-To`, `Authentication-Results`, `List-Unsubscribe` et `List-Unsubscribe-Post`.
10. Répondre au message et confirmer sa réception dans `eliana.m.corre@gmail.com`.

### Récupération

En cas d’échec, restaurer les enregistrements précédents, sans supprimer les MX ou règles Email Routing fonctionnels. Une modification SPF erronée se corrige sur l’enregistrement unique ; ne pas ajouter un deuxième SPF. Conserver les résultats DNS et en-têtes expurgés comme preuve.

## 4. Webhooks Loops

La procédure de configuration détaillée et de bascule temporaire se trouve dans `docs/agents/deployment.md`, section **Loops webhooks**.

### Vérification minimale

1. Confirmer l’URL `https://<deployment>.convex.site/loops/webhook`.
2. Activer uniquement `email.hardBounced`, `email.spamReported` et `email.unsubscribed`.
3. Vérifier qu’une signature absente ou invalide produit HTTP 401, un événement non pris en charge HTTP 400 et un événement valide HTTP 204.
4. Rejouer deux fois le même `Webhook-Id` et confirmer une seule modification métier.
5. Vérifier que rebond et plainte restreignent la livraison sans réécrire le consentement historique et qu’une désinscription préserve le droit à l’e-book.

### Récupération

Corriger l’URL ou le secret uniquement dans l’environnement touché, puis rejouer l’événement depuis l’historique Loops. Restaurer en priorité l’URL de production après toute bascule temporaire.

## 5. Publication et retour arrière de l’e-book

### Procédure

1. Ouvrir `/admin/ebooks` dans l’environnement ciblé.
2. Téléverser le PDF approuvé comme brouillon, avec un titre et une version explicites.
3. Prévisualiser le fichier et vérifier lisibilité, taille, nom, droits et absence de données sensibles.
4. Publier le brouillon ; confirmer qu’une seule version est marquée publiée.
5. Tester un lien personnel de 72 heures avec une identité synthétique autorisée.
6. Pour revenir en arrière, sélectionner une version antérieure vérifiée et utiliser l’action de restauration ; ne jamais remplacer un fichier immuable.

### Récupération

Si le fichier est incorrect, restaurer la dernière version approuvée. Les liens renouvelés servent la version publiée actuelle ; conserver l’historique de version et suivre `docs/agents/welcome-ebook-recovery.md` pour les accès individuels.

## 6. Préparation et envoi d’une campagne

### Prérequis

- Présentation expéditeur et pied de page approuvés par Eliana.
- Notice publiée et domaine authentifié.
- Consentements et suppressions réconciliés depuis Convex.
- Autorisation explicite avant tout test réel ou planification.

### Procédure obligatoire

1. Créer le brouillon dans Loops ; ne pas créer d’éditeur dans le site.
2. Choisir uniquement l’audience projetée depuis Convex.
3. Vérifier l’expéditeur, le Reply-To, l’objet et le pré-en-tête.
4. Vérifier le pied de page : identité, adresse postale, notice, contact et lien visible **Se désabonner**.
5. Confirmer dans les réglages Loops que le suivi d’ouverture et le suivi de clic sont désactivés.
6. Utiliser l’aperçu desktop et mobile ; vérifier texte brut, liens, images et variables manquantes.
7. Envoyer un test uniquement à `gregory.bouteiller@niama.fr` après autorisation.
8. Contrôler le rendu, les en-têtes d’authentification, le Reply-To et la désinscription.
9. Faire valider le test par l’approbateur nommé.
10. Refaire la réconciliation Convex → Loops immédiatement avant planification.
11. Planifier la campagne dans Loops ; enregistrer date, audience, approbateur et identifiant dans Linear.

### Annulation et récupération

Annuler dans Loops tant que la campagne n’est pas partie. Après départ, ne pas tenter un second envoi correctif automatique : évaluer l’impact, suspendre les campagnes suivantes et appliquer la procédure d’incident.

## 7. Diagnostic, alerte et relance d’une tâche

### Interface

Ouvrir `/admin/email-operations`. Une alerte terminale affiche le type de tâche, la catégorie structurée, le statut HTTP éventuel et le Workflow courant, sans adresse destinataire.

### Procédure

1. Ouvrir l’alerte et noter l’identifiant de tâche et le Workflow sans copier de donnée personnelle.
2. Dans Convex Dashboard, retrouver le Workflow et vérifier ses tentatives.
3. Dans Loops, vérifier l’opération correspondante en utilisant l’heure et les informations autorisées.
4. Corriger la cause : réseau, quota, modèle, clé, validation, isolation ou configuration.
5. Pour une erreur d’authentification, de modèle, de validation ou d’isolation, ne pas relancer avant correction.
6. Après autorisation, sélectionner **Relancer**, lire la confirmation puis confirmer.
7. Vérifier qu’un nouveau Workflow est ajouté à l’historique de la même tâche et que la clé d’idempotence reste inchangée.
8. Confirmer un seul envoi dans Loops et le passage de la tâche à `succeeded`.

### Politique de reprise

- confirmation : 12 tentatives maximum, première attente 30 secondes, base 2 ;
- e-book : 14 tentatives maximum, première attente 30 secondes, base 2 ;
- synchronisation ou suppression de contact : 10 tentatives maximum, première attente 60 secondes, base 2 ;
- seules les erreurs réseau, HTTP 429 et HTTP 5xx sont relancées automatiquement.

### Récupération

Si la relance reste en attente, consulter le nouveau Workflow. Si Loops indique déjà un succès, ne pas créer une nouvelle tâche : conserver la même tâche et la même clé. Toute divergence exige une réconciliation avant une autre action.

## 8. Demandes de confidentialité

Suivre `docs/agents/privacy-request-identity-verification.md` pour vérifier l’identité, traiter séparément chaque droit et conserver une trace minimale. Les demandes arrivent à `contact@elianacorre.com`.

Ne jamais utiliser une réponse transférée comme preuve suffisante, restaurer un consentement, lever une plainte sans nouvelle confirmation explicite ou modifier directement la base.

## 9. Export et réconciliation

### Export

Suivre `docs/agents/newsletter-retention-portability.md`. L’export JSON ou CSV de `/admin/privacy` est fournisseur-indépendant et constitue une donnée personnelle. Le stocker uniquement dans l’espace de migration approuvé et supprimer les copies temporaires.

### Réconciliation Convex → Loops

1. Produire l’export depuis le déploiement ciblé.
2. Comparer par adresse canonique les abonnés confirmés et éligibles avec l’audience Loops.
3. Ajouter ou mettre à jour via les tâches de synchronisation de l’application, jamais par import faisant de Loops l’autorité.
4. Désinscrire dans Loops les anciens abonnés, restrictions et suppressions présents à tort.
5. Ne pas réactiver automatiquement une plainte pour spam.
6. Relancer les échecs depuis `/admin/email-operations` avec leur clé originale.
7. Refaire l’export et confirmer que les écarts sont nuls ou explicitement expliqués.

### Récupération

Arrêter la réconciliation si elle élargit une audience. Restaurer la projection à partir de Convex, conserver l’export de preuve dans l’espace approuvé et supprimer les copies une fois l’incident clos.

## 10. Incident e-mail ou secret compromis

1. Suspendre les campagnes et les relances opérateur.
2. Identifier l’environnement, le secret, les données et la période concernés.
3. Révoquer ou isoler le secret compromis après autorisation urgente ; ne pas le copier dans le rapport.
4. Vérifier les journaux Convex, Workflow, Loops et Cloudflare avec minimisation des données.
5. Déterminer si des données personnelles ont été consultées, modifiées, perdues ou divulguées.
6. Consigner l’incident, les décisions, les responsables et les heures dans l’emplacement approuvé.
7. Évaluer avec le responsable du traitement les obligations de notification à la CNIL et aux personnes.
8. Restaurer la configuration connue, tester hors production puis demander l’autorisation de reprise.
9. Réconcilier Convex et Loops et vérifier qu’aucun envoi double n’a eu lieu.
10. Mettre à jour ce runbook, le registre Drive et la notice si les conditions ont changé.

Un incident actif autorise l’arrêt conservatoire nécessaire, pas une mise en production ou un envoi élargi.

## 11. Maintenance des textes juridiques et du registre

### Procédure

1. Modifier les constantes versionnées dans `packages/domain/src/helpers/legal-texts.ts` sur une branche Linear approuvée.
2. Vérifier identité, adresse, contact, finalités, bases, destinataires, durées, suivi, droits et transferts.
3. Faire approuver le texte métier et juridique avant fusion.
4. Exécuter les tests, le typecheck, la qualité et le build.
5. Lors du déploiement, `seed:init` compare le contenu publié aux constantes : un changement crée un nouveau texte et un nouveau bundle immuables ; un redéploiement identique ne crée rien.
6. Vérifier dans Convex que les nouveaux abonnements référencent le nouveau bundle et que les consentements antérieurs conservent leur version historique.
7. Mettre à jour le [registre Drive](https://docs.google.com/document/d/1pXfz8B3GrsWod0GYjYmGkPxPlxD9JGt0bOFRXTpP0CU/edit), son historique et sa date de revue.
8. Ajouter les preuves et liens à Linear.

### Récupération

Ne pas modifier un texte ou bundle existant. En cas d’erreur, publier une nouvelle version corrigée et documenter la période affectée. Un retour de code ne supprime pas la preuve historique.

## Vérification globale avant production

- [ ] Environnements, clés Loops et contacts séparés.
- [ ] Allowlist non productive prouvée avec un refus et un succès.
- [ ] SPF, DKIM et DMARC valides ; Email Routing intact.
- [ ] From, Reply-To, désinscription et en-têtes validés.
- [ ] Suivi d’ouverture et de clic désactivé.
- [ ] Webhooks authentifiés et idempotents.
- [ ] Politique de reprise testée pour erreurs temporaires et permanentes.
- [ ] Alerte et relance opérateur testées sans doublon.
- [ ] Aperçu et envoi test de campagne validés.
- [ ] Notice, pied de page et registre approuvés.
- [ ] Procédures d’export, réconciliation, confidentialité et incident exécutées en environnement sûr.

## Maintenance

Grégory maintient ce runbook. Le mettre à jour lors de tout changement de fournisseur, domaine, adresse, événement webhook, politique de reprise, variable, interface d’administration, durée, texte juridique ou procédure d’incident. Après chaque exécution, enregistrer le résultat observable, les écarts et la récupération dans Linear sans donnée personnelle ni secret.

## Correspondance avec l’automatisation

L’application automatise la création durable des tâches, les reprises temporaires, l’idempotence, l’alerte terminale, l’historique Workflow, la relance contrôlée, la rétention et la publication versionnée des textes. L’équivalent humain consiste à suivre les écrans Convex, Loops et `/admin`, vérifier les résultats décrits et n’utiliser que les actions documentées. L’automatisation n’approuve ni une campagne, ni une modification externe, ni une mise en production.
