# Fichiers de traduction

Ce dossier contient les fichiers de traduction pour l'application.

## Structure

- `en.json` - Traductions en anglais
- `fr.json` - Traductions en français

## Ajouter une nouvelle traduction

1. Ajoutez la clé dans les deux fichiers (`en.json` et `fr.json`)
2. Utilisez la clé dans vos composants avec `useTranslation()`:

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t("ma.nouvelle.cle")}</div>;
}
```

## Structure des clés

Les clés sont organisées par namespace:
- `sidebar.*` - Éléments de la barre latérale
- `topbar.*` - Éléments de la barre supérieure
- `common.*` - Textes communs réutilisables
- `customer.*` - Textes liés aux clients

## Ajouter une nouvelle langue

1. Créez un nouveau fichier `{code}.json` (ex: `es.json` pour l'espagnol)
2. Ajoutez la langue dans `src/lib/i18n.ts`:

```ts
import esTranslations from "@/locales/es.json";

// Dans resources:
es: {
  translation: esTranslations
}
```

3. Ajoutez la langue dans `src/components/LanguageSwitcher.tsx`









