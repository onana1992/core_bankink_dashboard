import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import des traductions
import frTranslations from "./locales/fr.json";
import enTranslations from "./locales/en.json";

// Les langues supportées
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

// Langue par défaut
export const defaultLocale: Locale = "fr";

// Initialisation i18n - uniquement côté client
if (typeof window !== "undefined" && !i18n.isInitialized) {
	i18n
		.use(LanguageDetector)
		.use(initReactI18next)
		.init({
			resources: {
				fr: {
					translation: frTranslations
				},
				en: {
					translation: enTranslations
				}
			},
			fallbackLng: defaultLocale,
			lng: defaultLocale,
			debug: false,
			interpolation: {
				escapeValue: false
			},
			detection: {
				order: ["localStorage", "navigator"],
				caches: ["localStorage"],
				lookupLocalStorage: "i18nextLng"
			}
		});
}

export default i18n;
