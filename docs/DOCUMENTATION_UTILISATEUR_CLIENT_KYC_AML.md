# Guide utilisateur — Clients, KYC et AML

> **Public** : agents OPS, analystes conformité, responsables KYC/AML.  
> **Application** : back-office `core_bankink_dashboard` (connexion requise).  
> **Documentation technique associée** : `core_banking_backend/doc/DOCUMENTATION_TECHNIQUE_CLIENT_KYC_AML.md`

---

## Sommaire

1. [Introduction](#1-introduction)
2. [Accès et navigation](#2-accès-et-navigation)
3. [Module Clients](#3-module-clients)
4. [Module KYC (dans la fiche client)](#4-module-kyc-dans-la-fiche-client)
5. [Module AML](#5-module-aml)
6. [Tâches de conformité](#6-tâches-de-conformité)
7. [Référentiels et audit](#7-référentiels-et-audit)
8. [Cas d’usage pas à pas](#8-cas-dusage-pas-à-pas)
9. [Statuts et libellés](#9-statuts-et-libellés)
10. [Messages d’erreur fréquents](#10-messages-derreur-fréquents)
11. [Bonnes pratiques](#11-bonnes-pratiques)

---

## 1. Introduction

Le back-office permet de gérer l’**onboarding client** (personne ou entreprise), la **vérification KYC** (Know Your Customer) et la **conformité AML** (Anti-Money Laundering / lutte contre le blanchiment).

| Module | Ce que vous y faites |
|--------|----------------------|
| **Clients** | Créer et enrichir un dossier (profil, adresses, documents, personnes liées pour les entreprises). |
| **KYC** | Contrôler l’identité, lancer le screening, calculer le risque, accepter ou refuser le dossier. |
| **AML** | Suivre les alertes transactionnelles, ouvrir des dossiers d’investigation, gérer les profils de risque. |

**Ordre logique** : un client est d’abord créé et complété, puis passé en revue KYC. Une fois **vérifié**, il peut ouvrir des comptes ; ses opérations sont surveillées par l’AML.

---

## 2. Accès et navigation

### 2.1 Connexion

1. Ouvrez l’URL du back-office fournie par votre administrateur.
2. Saisissez votre **nom d’utilisateur** et **mot de passe**.
3. Après connexion, vous accédez au tableau de bord OPS.

> Si votre session expire, un message vous invite à vous reconnecter.

### 2.2 Menu latéral (extrait utile)

| Entrée du menu | Page | Usage |
|----------------|------|-------|
| **Clients & KYC** → Dossiers client | `/customers` | Liste et fiches clients |
| **Règles KYC** | `/kyc/rules` | Consultation du catalogue de règles (admin / conformité) |
| **Piste d'audit KYC** | `/kyc/audit-trail` | Journal global des actions KYC |
| **AML / LBC-FT** → Alerte AML | `/aml/alerts` | Worklist des alertes |
| **Nouvelle alerte** | `/aml/alerts/new` | Créer une alerte manuelle |
| **Dossier AML** | `/aml/cases` | Dossiers d’investigation |
| **Règles AML** | `/aml/rules` | Catalogue des règles transactionnelles |
| **Piste d’audit AML** | `/aml/audit-trail` | Journal global AML |
| **Vigilance AML** | `/compliance/vigilance` | État du dernier traitement automatique des profils |

> La page **Profils de risque AML** (`/aml/risk-profiles`) est accessible depuis la fiche client (onglet Aperçu), pas depuis le menu principal.

### 2.3 Droits d’accès

Certaines actions nécessitent des permissions spécifiques (attribuées par l’administrateur) :

| Action | Permission typique |
|--------|-------------------|
| Lire alertes / dossiers / profils AML | `AML:READ` |
| Modifier alertes, dossiers, règles AML | `AML:WRITE` |
| Clôturer une alerte AML | `AML:CASE_CLOSE` |
| Gérer le catalogue règles KYC | `KYC_CATALOG:READ` / `WRITE` |

Si une action est grisée ou renvoie une erreur d’accès, contactez votre administrateur.

---

## 3. Module Clients

### 3.1 Liste des clients (`/customers`)

La **worklist** affiche tous les dossiers avec :

- **Filtres** : recherche (nom, e-mail), statut, type (personne / entreprise).
- **Filtres rapides** : *À traiter*, *Bloqués*, *Brouillons*, etc.
- **Tri** : priorité métier (dossiers urgents en premier), risque décroissant, ou dossiers récents.
- **Compteurs** : brouillons, en attente, vérifiés, rejetés, bloqués.

Cliquez sur **Voir** pour ouvrir la fiche client.

### 3.2 Créer un nouveau client

Deux parcours guidés existent :

| Parcours | Menu / URL | Contenu |
|----------|------------|---------|
| **Personne physique** | Nouveau client personne → `/customers/new/person` | Identité, adresse, documents, aperçu risque |
| **Personne morale** | Nouveau client entreprise → `/customers/new/business` | Société, représentant, UBO/directeurs, documents |

À la fin du parcours :
- Le client est créé en statut **Brouillon**.
- Un message confirme la création ; utilisez **Ouvrir la fiche client** pour poursuivre la revue KYC.

### 3.3 Fiche client — vue d’ensemble

La fiche est organisée en **onglets** :

| Onglet | Contenu |
|--------|---------|
| **Aperçu** | Synthèse : statut, score risque, PEP, dates, raccourcis AML |
| **Profil & données KYC** | Coordonnées, identité, données entreprise (si applicable) |
| **Documents** | Pièces justificatives (CNI, passeport, domicile, selfie, etc.) |
| **Conformité (KYC/AML)** | Workflow KYC complet (voir §4) |
| **Comptes** | Comptes bancaires liés (après vérification) |

En haut de la fiche, une **bandeau récapitulatif** affiche : statut du dossier, type, score risque, indicateur PEP, référence client.

### 3.4 Enrichir le dossier (avant KYC)

#### Profil

- Modifiez les informations via **Modifier** puis **Enregistrer**.
- Pour une **entreprise** : forme juridique, immatriculation, secteur d’activité, source des fonds, etc.
- Pour une **personne** : identité, profession, résidence fiscale, etc.

#### Adresses

- Ajoutez une ou plusieurs adresses (résidentielle, professionnelle, courrier).
- Une adresse peut être marquée **principale**.

#### Documents

1. Cliquez sur **Uploader un document** ou **Nouveau**.
2. Choisissez le **type** (CNI, passeport, justificatif de domicile, extrait d’immatriculation, selfie).
3. Pour une **CNI** : indiquez recto ou verso ; pour le recto, saisissez numéro et pays émetteur.
4. Sélectionnez le fichier et validez l’envoi.
5. Chaque document apparaît en **En attente** jusqu’à revue.

**Revue documentaire** :
- Ouvrez **Réviser** sur un document.
- **Approuver** ou **Rejeter**, avec une note optionnelle pour l’audit.

#### Personnes liées (entreprises uniquement)

- Rôles : **UBO** (bénéficiaire effectif), **Directeur**, **Signataire**.
- Pour un UBO, le **pourcentage de détention** est obligatoire.
- Indiquez si la personne est **PEP**.

#### Photo / selfie

- Uploadez un selfie depuis l’onglet Aperçu ou Documents.
- Formats image acceptés (JPEG, PNG, etc.).

### 3.5 Statuts du dossier client

| Statut affiché | Signification | Prochaine action typique |
|----------------|---------------|--------------------------|
| **Brouillon** | Dossier en cours de saisie | Compléter profil, documents, puis soumettre en revue KYC |
| **En attente d'examen** | Dossier soumis, en attente de décision | Finaliser revues KYC et vérifier ou rejeter |
| **Vérifié** | KYC accepté | Ouverture de comptes, surveillance AML active |
| **Rejeté** | KYC refusé | Corriger le dossier et resoumettre, ou archiver |
| **Bloqué** | Blocage administratif / conformité | Traiter avec le responsable conformité |

---

## 4. Module KYC (dans la fiche client)

L’onglet **Conformité (KYC/AML)** regroupe tout le workflow KYC en **sous-onglets**.

### 4.1 Enchaînement recommandé

Le système recommande cet ordre (affiché dans l’interface) :

```
1. Revues ligne (e-mail, profil, identité)
      ↓
2. Screening PEP & Sanctions
      ↓
3. Évaluation du risque (moteur)
      ↓
4. Décision (soumettre → vérifier ou rejeter)
```

> **Important** : le calcul du score de risque n’est possible qu’**après** au moins un screening sanctions ou PEP.

### 4.2 Sous-onglet « Revue KYC »

Trois revues indépendantes, chacune avec statut **En attente**, **Approuvé** ou **Rejeté** :

| Revue | Objet |
|-------|--------|
| **E-mail** | Validité et cohérence de l’adresse e-mail |
| **Profil** | Données déclarées (identité, activité, etc.) |
| **Identité** | Cohérence des pièces d’identité |

Utilisez **Approuver** ou **Rejeter** pour chaque ligne. Les trois revues doivent être **approuvées** avant de pouvoir **vérifier** le client (message affiché sinon).

### 4.3 Sous-onglet « Screening PEP & Sanctions »

1. Cliquez sur **Lancer le screening sur listes** (ou **Nouveau screening**).
2. Le système enregistre des contrôles **Sanctions** et **PEP** (simulation en environnement de test).
3. Consultez le tableau des contrôles : type, résultat, date, fournisseur.

**Résultats possibles** :

| Résultat | Signification |
|----------|---------------|
| **Conforme (PASS)** | Aucun point bloquant détecté |
| **Révision requise (REVIEW)** | Analyse manuelle nécessaire avant décision |
| **Non conforme (FAIL)** | Point bloquant — traiter avant validation |

Vous pouvez **relancer le screening** à tout moment (par ex. après correction du dossier).

### 4.4 Sous-onglet « Décision KYC »

#### Étape 1 — Indicateur PEP pour l’évaluation

- Cochez **Traiter le client comme PEP** si pertinent pour ce calcul (indépendant du flag PEP enregistré sur le profil).
- Modifiez cette case pour **relancer le calcul** du score.

#### Étape 2 — Moteur de risque onboarding

Après le screening, le moteur affiche :

| Information | Description |
|-------------|-------------|
| **Score proposé** | Note numérique calculée automatiquement |
| **Bande de risque** | Faible / Modérée / Élevée |
| **Décision opérationnelle** | Parcours standard, revue renforcée, EDD requis, ou blocage |
| **Règles déclenchées** | Liste des règles ayant influencé le score |
| **Blocage moteur** | Si présent : le dossier ne peut pas être vérifié (selon configuration) |

**Décisions possibles** :

| Décision | Effet métier |
|----------|--------------|
| Parcours standard | Dossier standard, pas de tâche EDD automatique |
| Revue renforcée | Une tâche « revue KYC/AML renforcée » peut être créée |
| EDD requis | Une tâche « revue EDD » est créée ; peut bloquer la vérification |
| Blocage | Vérification impossible tant que le blocage n’est pas levé |

#### Étape 3 — Actions de décision

| Action | Quand l’utiliser | Effet |
|--------|------------------|-------|
| **Soumettre** | Dossier prêt pour revue interne | Passe en **En attente d'examen** |
| **Vérifier** | Revues approuvées, screening OK, pas de blocage | Passe en **Vérifié** ; synchronise le profil AML |
| **Rejeter KYC** | Dossier non conforme | Passe en **Rejeté** ; saisissez un **motif** (obligatoire pour l’audit) |

> Avant **Vérifier**, vérifiez qu’aucune tâche EDD ouverte ne bloque l’action (bandeau orange dans l’onglet Tâches conformité).

### 4.5 Sous-onglet « Tâches conformité »

Voir [§6 Tâches de conformité](#6-tâches-de-conformité).

### 4.6 Sous-onglet « Historique des évaluations KYC »

- Liste de toutes les exécutions du moteur de scoring (date, score, bande, décision).
- **Détails** : règles matchées, PEP pris en compte, origine (consultation ou vérification).

### 4.7 Sous-onglet « Piste d’audit KYC »

Journal chronologique des actions sur ce dossier : création, soumission, vérification, revues, documents, tâches conformité, etc.

### 4.8 Raccourcis AML depuis la fiche

Dans l’onglet **Aperçu**, le panneau **AML / LBC-FT** permet d’accéder directement à :

- **Profils de risque AML** pour ce client
- **Alertes AML** filtrées sur ce client
- **Nouveau dossier AML** pré-rempli avec l’ID client

---

## 5. Module AML

### 5.1 Alertes AML (`/aml/alerts`)

Les alertes signalent des opérations ou situations suspectes (règles automatiques ou saisie manuelle).

#### Liste

- **Filtres** : ID client, statut, gravité.
- **Compteurs** : nouvelles, en cours, clôturées, haute gravité.
- Cliquez sur **Voir** pour ouvrir le détail.

#### Cycle de vie d’une alerte

```
Nouvelle → Assignée → En revue → Escaladée → Clôturée
```

| Étape | Action dans l’interface |
|-------|-------------------------|
| Prise en charge | **Assigner** à un utilisateur |
| Analyse | **Mettre à jour le statut** (avancer dans le flux) |
| Investigation structurée | **Ouvrir un dossier** ou rattacher à un dossier existant |
| Clôture | **Clôturer** avec un motif (faux positif, expliqué, escalade déclaration, autre) |

> Le motif **Autre** exige un **commentaire obligatoire**.

#### Créer une alerte manuelle (`/aml/alerts/new`)

1. Saisissez l’**ID client** (obligatoire).
2. Optionnel : ID compte, ID transaction.
3. Renseignez un **titre** et la **gravité**.
4. Validez **Créer l’alerte**.

### 5.2 Dossiers AML (`/aml/cases`)

Un **dossier** regroupe une ou plusieurs alertes pour le même client afin d’mener une investigation.

#### Créer un dossier (`/aml/cases/new`)

1. Indiquez l’**ID client**.
2. Listez les **IDs des alertes** à rattacher (séparés par virgules).
3. Optionnel : assignez un **responsable**.
4. Cliquez sur **Créer le dossier**.

**Règles** :
- Toutes les alertes doivent concerner le **même client**.
- Les alertes ne doivent pas être déjà liées à un autre dossier **ouvert**.
- Les alertes **clôturées** ne peuvent pas être ajoutées.

#### Détail d’un dossier

| Onglet | Contenu |
|--------|---------|
| **Synthèse** | Alertes liées, lien vers la fiche client |
| **Notes** | Commentaires des analystes (ajout tant que le dossier n’est pas clôturé) |
| **Statut** | Faire avancer le dossier : Ouvert → En revue → Escaladé → Clôturé |
| **Déclaration** | Créer un enregistrement de déclaration interne (brouillon) |

**Actions complémentaires** :
- **Réassigner le responsable**
- **Rattacher des alertes** supplémentaires
- Consulter l’**historique des statuts**

> Un dossier **clôturé** : plus de notes ni de changement de statut possibles.

### 5.3 Profils de risque AML (`/aml/risk-profiles`)

Accessible via la fiche client ou en saisissant `?clientId=XXX` dans l’URL.

| Action | Usage |
|--------|-------|
| **Charger l’historique** | Affiche tous les snapshots de profil pour le client |
| **Recalculer** | Relance le moteur KYC et met à jour le profil AML actif |
| **Forcer le niveau** | Décision manuelle documentée (niveau, diligence, motif ≥ 20 caractères) — réservé à la conformité |

Chaque profil affiche : niveau (faible / modéré / élevé), score, niveau de diligence (standard / renforcé), date de calcul, facteurs.

### 5.4 Règles AML (`/aml/rules`)

Référentiel des règles de **monitoring transactionnel** (réservé admin / conformité).

- Consultez les définitions par **catégorie** (montant, vélocité, structuration, etc.).
- **Publiez une version** avec date d’effet pour activer une règle en production.
- Activez ou désactivez une version existante.

> Les seuils métier sont dans le moteur de règles ; le catalogue indique quelles règles sont actives et quand.

### 5.5 Vigilance AML (`/compliance/vigilance`)

Page de **suivi du traitement automatique** qui recalcule périodiquement les profils de risque des clients vérifiés dont le profil est obsolète (par défaut : plus de 90 jours).

Affiche la date du dernier run, le nombre de clients traités et les éventuelles erreurs.

---

## 6. Tâches de conformité

Les tâches de conformité relient le **scoring KYC** au travail humain (EDD, revue renforcée).

### 6.1 Types de tâches

| Type affiché | Déclenché quand |
|--------------|-----------------|
| **Revue EDD** | Décision « EDD requis » ou bande de risque **élevée** |
| **Revue KYC/AML renforcée** | Décision « revue renforcée » ou bande **modérée** |

Les tâches peuvent aussi être **créées manuellement** par l’analyste.

### 6.2 Statuts

| Statut | Signification |
|--------|---------------|
| **Ouverte** | À traiter |
| **Terminée** | Travail effectué, note de résolution possible |
| **Annulée** | Tâche sans suite |

### 6.3 Utilisation (onglet Tâches conformité)

1. Consultez la liste ; un **bandeau orange** signale des revues EDD encore ouvertes.
2. Pour créer une tâche : **Nouvelle tâche** → type + consigne optionnelle → **Créer**.
3. Pour clôturer : **Ouvrir** → saisir une note de résolution → **Marquer terminée** ou **Annuler**.

> Si l’option d’enforcement est active, vous **ne pouvez pas vérifier le KYC** tant qu’une tâche EDD est ouverte.

---

## 7. Référentiels et audit

### 7.1 Règles KYC (`/kyc/rules`)

Catalogue des règles du moteur d’onboarding (consultation, création, modification pour profils autorisés). Utile pour comprendre pourquoi un score ou une décision a été produit.

### 7.2 Pistes d’audit globales

| Page | Contenu |
|------|---------|
| `/kyc/audit-trail` | Toutes les actions KYC (tous clients) |
| `/aml/audit-trail` | Toutes les actions AML |

Filtrez par date, utilisateur ou type d’action. La piste d’audit **par client** reste dans la fiche → onglet Conformité → Piste d’audit KYC.

---

## 8. Cas d’usage pas à pas

### 8.1 Onboarding complet — personne physique

| # | Étape | Où |
|---|-------|-----|
| 1 | Créer le client via l’assistant personne | `/customers/new/person` |
| 2 | Compléter profil et adresse | Fiche → Profil & données KYC |
| 3 | Uploader CNI (recto/verso), justificatif domicile, selfie | Fiche → Documents |
| 4 | Approuver chaque document | Réviser → Approuver |
| 5 | Approuver revues e-mail, profil, identité | Conformité → Revue KYC |
| 6 | Lancer le screening listes | Conformité → Screening |
| 7 | Consulter le score et la bande de risque | Conformité → Décision KYC |
| 8 | Traiter les tâches conformité si créées | Conformité → Tâches conformité |
| 9 | Soumettre pour revue | Décision KYC → Soumettre |
| 10 | Vérifier le KYC | Décision KYC → Vérifier |
| 11 | Ouvrir des comptes si besoin | Fiche → Comptes |

### 8.2 Onboarding — personne morale

Même logique, avec en plus :
- Données juridiques et financières dans **Profil**
- **Personnes liées** (UBO, directeurs) dans l’onglet dossier
- Documents : extrait d’immatriculation, justificatif siège, pièce du représentant

### 8.3 Traiter une alerte AML

| # | Étape |
|---|-------|
| 1 | Ouvrir `/aml/alerts`, filtrer si besoin |
| 2 | Ouvrir l’alerte → lire contexte (client, compte, transaction, faits) |
| 3 | **Assigner** à un collègue ou à soi-même |
| 4 | Passer le statut en **En revue** |
| 5 | Si investigation nécessaire : **Ouvrir un dossier** |
| 6 | Ajouter des **notes** dans le dossier |
| 7 | Si soupçon avéré : créer une **déclaration** (brouillon) |
| 8 | **Clôturer** l’alerte avec le motif adapté |

### 8.4 Resoumettre un dossier rejeté

1. Corriger profil, documents ou pièces refusées.
2. Relancer le screening si nécessaire.
3. **Soumettre** à nouveau (depuis Brouillon ou Rejeté → En attente d'examen).
4. Reprendre le workflow jusqu’à **Vérifier**.

### 8.5 Re-KYC demandé par l’AML

Si un bandeau **Contexte re-KYC AML** apparaît dans l’onglet Conformité :
1. Lisez le motif affiché.
2. Mettez à jour les pièces et contrôles concernés.
3. Relancez screening et évaluation.
4. Traitez les tâches conformité ouvertes.
5. Procédez à une nouvelle vérification si la procédure interne le permet.

---

## 9. Statuts et libellés

### 9.1 Gravités d’alerte AML

| Libellé | Priorité indicative |
|---------|---------------------|
| Info | Faible |
| Faible | À surveiller |
| Moyenne | Traitement standard |
| Haute | Prioritaire |
| Critique | Urgent |

### 9.2 Motifs de clôture d’alerte

| Motif | Usage |
|-------|-------|
| Faux positif | L’alerte ne correspond pas à un risque réel |
| Expliqué | Comportement justifié et documenté |
| Escalade déclaration | Transmis au processus de déclaration |
| Autre | Préciser dans le commentaire (obligatoire) |

### 9.3 Niveaux de profil risque AML

| Niveau | Diligence souvent associée |
|--------|----------------------------|
| Faible (LOW) | Standard |
| Modéré (MEDIUM) | Standard ou renforcée selon signaux |
| Élevé (HIGH) | Renforcée (EDD) |

---

## 10. Messages d’erreur fréquents

| Message / situation | Cause probable | Que faire |
|---------------------|----------------|-----------|
| Screening requis avant évaluation | Pas de contrôle sanctions/PEP | Lancer le screening listes |
| Revues non approuvées | E-mail, profil ou identité en attente/rejeté | Approuver les trois revues |
| Blocage moteur | Règle KYC bloquante (sanctions, identité, UBO…) | Corriger le dossier, relancer l’évaluation |
| Tâche EDD ouverte | Revue renforcée non terminée | Clôturer la tâche EDD ou annuler si non pertinente |
| Document identité en doublon | Même pièce sur un autre client | Vérifier le numéro et le pays émetteur |
| E-mail / téléphone déjà utilisé | Unicité contact | Utiliser d’autres coordonnées ou vérifier le doublon |
| Alerte déjà dans un dossier ouvert | Règle métier dossiers | Clôturer l’ancien dossier ou utiliser celui-ci |
| Permission refusée | Droits insuffisants | Contacter l’administrateur |
| Session expirée | Inactivité | Se reconnecter |

Les messages détaillés s’affichent en français ou en anglais selon la langue choisie dans l’application.

---

## 11. Bonnes pratiques

### Pour les agents KYC

- **Ne vérifiez pas** un dossier incomplet (documents manquants ou non approuvés).
- Respectez l’**ordre recommandé** : revues → screening → score → décision.
- Saisissez toujours un **motif de rejet** explicite et auditable.
- Consultez l’**historique des évaluations** en cas de contestation du score.

### Pour les analystes AML

- **Assignez** rapidement les alertes nouvelles pour éviter l’accumulation.
- Regroupez les alertes liées dans un **même dossier** par client.
- Documentez vos analyses dans les **notes** de dossier.
- Clôturez les alertes avec un **motif cohérent** après décision.
- Utilisez le **forçage de profil** uniquement avec un motif détaillé (≥ 20 caractères).

### Pour tous

- Utilisez les **filtres** et tris de worklist pour prioriser les dossiers urgents.
- En cas de doute sur une règle ou un statut, consultez la **piste d’audit**.
- Ne partagez pas vos identifiants ; déconnectez-vous sur poste partagé.

---

## Annexe — Correspondance routes / menu

| Besoin utilisateur | Route |
|--------------------|-------|
| Voir tous les clients | `/customers` |
| Créer une personne | `/customers/new/person` |
| Créer une entreprise | `/customers/new/business` |
| Fiche personne | `/customers/person/{id}` |
| Fiche entreprise | `/customers/business/{id}` |
| Alertes AML | `/aml/alerts` |
| Nouvelle alerte | `/aml/alerts/new` |
| Détail alerte | `/aml/alerts/{id}` |
| Dossiers AML | `/aml/cases` |
| Nouveau dossier | `/aml/cases/new` |
| Profils risque (par client) | `/aml/risk-profiles?clientId={id}` |
| Règles KYC | `/kyc/rules` |
| Règles AML | `/aml/rules` |
| Audit KYC global | `/kyc/audit-trail` |
| Audit AML global | `/aml/audit-trail` |
| Vigilance périodique | `/compliance/vigilance` |

---

*Guide utilisateur — version alignée sur l’interface OPS mai 2026.*
