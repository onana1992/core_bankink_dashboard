Admin Pro Template (Next.js + Tailwind + Radix UI)

## Démarrage

Installer les dépendances puis lancer le serveur de dev:

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:3000`.

## Structure

```
src/
  app/
    page.tsx               # Dashboard (squelette)
    customers/page.tsx     # Customers (vide)
    accounts/page.tsx      # Accounts (vide)
    transactions/page.tsx  # Transactions (vide)
    reports/page.tsx       # Reports (vide)
    users/page.tsx         # Users (vide)
    settings/page.tsx      # Settings (vide)
    layout.tsx             # Layout admin (Sidebar + Topbar)
    globals.css            # Styles globaux (Tailwind)
  components/
    admin/
      AdminSidebar.tsx     # Sidebar avec Collapsible (Radix)
      AdminTopbar.tsx      # Topbar avec Dropdown, Tooltip, Dialog (Radix)
      MobileSidebar.tsx    # Sidebar mobile (Dialog en drawer)
      PageHeader.tsx       # En-tête de page (breadcrumbs + actions)
      Breadcrumbs.tsx      # Fil d’Ariane
      AdminCard.tsx        # Carte générique
      AdminStatCard.tsx    # Carte KPI
      AdminTable.tsx       # Tableau générique
    ui/
      Button.tsx           # Bouton
      Input.tsx            # Champ texte
      Badge.tsx            # Badge d’état
  lib/
    utils.ts               # utilitaire cn()
```

## Personnalisation
- Ajoutez vos modules métier dans `app/*`.
- Remplacez les sections “vide” par vos listes/formulaires/tableaux.
- Utilisez les composants Radix (Tabs, Toast, Accordion, Popover…) au besoin.

## Production
```bash
npm run build
npm start
```

Pour le déploiement, suivez la documentation Next.js.
