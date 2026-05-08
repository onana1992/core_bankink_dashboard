# Guidelines UI v1 — OPS / KYC / AML

Version cible : **Phase 1 — Foundation UI** (dashboard `core_bankink_dashboard`).

## 1. Principes

- **Cohérence** : listes, filtres, pagination et erreurs utilisent les mêmes patterns visuels et composants.
- **Domaine** : séparer clairement les sémantiques **KYC**, **AML** et **audit métier** (badges et libellés).
- **Responsive** : grilles en `1 → 2 → 3 → 6` colonnes selon la largeur ; tableaux en défilement horizontal (`overflow-x-auto`).
- **Erreurs API** : tout message utilisateur passe par `resolveApiExceptionMessage` + `translateApiError` (clés `apiErrors.*` pour le backend `error.*`).

## 2. Tokens CSS

Fichier : `src/app/globals.css` (`:root`).

- Rayons : `--ops-radius-*`, bordures `--ops-border`, surfaces `--ops-surface*`, texte `--ops-fg*`, anneau focus `--ops-ring`.
- Domaines (documentation / accent) : `--ops-domain-kyc`, `--ops-domain-aml`, `--ops-domain-audit`.
- Toasts : `--ops-toast-*`.

Extension Tailwind : `tailwind.config.ts` (`colors.ops`, `boxShadow`, `borderRadius` préfixés `ops-`).

## 3. Bibliothèque de composants (`src/components/ops/`)

| Composant | Rôle |
|-----------|------|
| `OpsPageHeader` | Titre, sous-titre, zone d’actions. |
| `OpsFilterPanel` | Carte filtres + grille responsive. |
| `OpsField` | Label + contrôle. |
| `OpsSelect` | `<select>` harmonisé (filtres + cohérence avec pagination). |
| `OpsTableCard` | En-tête optionnelle + corps tableau. |
| `OpsLoadingState` / `OpsEmptyState` | États liste (`embedded` dans une carte existante). |
| `OpsInlineAlert` | Bandeau erreur / info. |
| `OpsModal` | Modale Radix (accessibilité, overlay). |
| `DomainStatusBadge` | Badges normalisés (`domain`: `kyc` \| `aml` \| `audit` + `category` + `code`). |
| `opsClasses.ts` | Constantes Tailwind (`OPS_TABLE`, `OPS_TH`, `OPS_PAGE_STACK`, …). |
| `auditActionBadgeClasses.ts` | Couleurs des actions d’audit (réutilisé par `AuditEventDetails`). |

Import recommandé :

```ts
import { OpsPageHeader, OpsFilterPanel, DomainStatusBadge, OPS_PAGE_STACK } from "@/components/ops";
```

## 4. Pagination & toasts

- **Pagination** : `TablePagination` — pied de tableau aligné tokens OPS (`border-ops-border`, `bg-ops-surface-muted`).
- **Toasts** : `ToastProvider` + événement `show-toast` ; couleurs issues des variables `--ops-toast-*`.

## 5. Traductions erreurs API

- Clés génériques : `apiErrors.network`, `apiErrors.unknown`.
- Backend `error.identity.document.duplicate` → clé i18n `apiErrors.identity_document_duplicate` (points → underscores après `error.`).

Ajouter de nouvelles clés dans `src/locales/fr.json` et `en.json` sous `apiErrors`.

## 6. Pages pilotes Phase 1

- `/customers` — en-tête, filtres, tableau, badges KYC (`DomainStatusBadge`), erreurs unifiées.
- `/audit` — filtres OPS, alerte erreur, tableau audit harmonisé.

## 7. Évolutions suggérées (hors périmètre immédiat)

- Migrer d’autres écrans AML (alertes, dossiers) vers `DomainStatusBadge` avec `category` adaptée.
- Remplacer les modales « maison » par `OpsModal` là où pertinent.
- Centraliser les liens primaires (`text-blue-600`) vers une classe/token `ops-link` si besoin.
