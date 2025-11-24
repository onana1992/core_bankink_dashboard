"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
	const { i18n, ready } = useTranslation();

	useEffect(() => {
		if (!ready) return;

		// After hydration, detect and apply user's preferred language
		// This runs only on client after the initial render matches the server
		if (typeof window !== "undefined") {
			const storedLang = localStorage.getItem("i18nextLng");
			const browserLang = navigator.language.split("-")[0];
			const detectedLang = storedLang || (browserLang === "fr" ? "fr" : "en");
			
			// Only change if different from current (which is "en" initially)
			if (i18n.language !== detectedLang) {
				i18n.changeLanguage(detectedLang).catch(console.error);
			}
		}
	}, [i18n, ready]);

	// Always render children - i18n starts with "en" on both server and client
	// Language detection happens after hydration in useEffect
	return <>{children}</>;
}

