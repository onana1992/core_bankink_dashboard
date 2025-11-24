import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translation files
import enTranslations from "@/locales/en.json";
import frTranslations from "@/locales/fr.json";

// Initialize i18n - always start with "en" to match server render and avoid hydration mismatch
// Language detection will happen manually after hydration in I18nProvider
if (!i18n.isInitialized) {
	const isClient = typeof window !== "undefined";
	
	i18n
		.use(initReactI18next)
		.init({
			resources: {
				en: {
					translation: enTranslations
				},
				fr: {
					translation: frTranslations
				}
			},
			fallbackLng: "en",
			lng: "en", // Always start with "en" to match server render
			debug: process.env.NODE_ENV === "development",
			interpolation: {
				escapeValue: false
			},
			defaultNS: "translation",
			ns: ["translation"],
			react: {
				useSuspense: false, // Important for Next.js App Router
				bindI18n: "languageChanged loaded", // Bind to language changes
				bindI18nStore: "added removed", // Bind to store changes
				transEmptyNodeValue: "", // Empty value for missing translations
				transSupportBasicHtmlNodes: true, // Support basic HTML in translations
				transWrapTextNodes: "" // Don't wrap text nodes
			},
			// Ensure immediate updates
			updateMissing: false,
			cleanCode: true
		});
}

export default i18n;

