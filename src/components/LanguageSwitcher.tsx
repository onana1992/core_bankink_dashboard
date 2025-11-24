"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
	const { i18n, ready } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const [currentLang, setCurrentLang] = useState(i18n.language || "en");
	const dropdownRef = useRef<HTMLDivElement>(null);

	const languages = [
		{ code: "en", label: "English" },
		{ code: "fr", label: "Français" }
	];

	const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

	// Update current language when i18n language changes (sync with i18n)
	useEffect(() => {
		if (i18n.language && i18n.language !== currentLang) {
			setCurrentLang(i18n.language);
		}
	}, [i18n.language, currentLang]);

	// Listen to language changes from other sources
	useEffect(() => {
		const handleLanguageChanged = (lng: string) => {
			setCurrentLang(lng);
		};

		i18n.on("languageChanged", handleLanguageChanged);

		return () => {
			i18n.off("languageChanged", handleLanguageChanged);
		};
	}, [i18n]);

	const switchLanguage = (langCode: string) => {
		// Don't do anything if already on this language
		if (langCode === i18n.language) {
			setIsOpen(false);
			return;
		}
		
		// Update state immediately for instant UI feedback
		setCurrentLang(langCode);
		setIsOpen(false);
		
		// Save to localStorage immediately
		if (typeof window !== "undefined") {
			localStorage.setItem("i18nextLng", langCode);
		}
		
		// Change language in i18n synchronously for immediate effect
		// This will trigger re-renders in all components using useTranslation
		i18n.changeLanguage(langCode, () => {
			// Callback after language is changed - ensure state is synced
			setCurrentLang(i18n.language);
		}).catch((error) => {
			console.error("Error changing language:", error);
			// Revert on error
			setCurrentLang(i18n.language);
		});
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors bg-white"
				aria-label="Switch language"
				aria-expanded={isOpen}
			>
				<Globe className="h-4 w-4 text-gray-700" />
				<span className="text-sm font-medium text-gray-700 hidden sm:inline">{currentLanguage.label}</span>
				<span className="text-sm font-medium text-gray-700 sm:hidden">{currentLanguage.code.toUpperCase()}</span>
			</button>
			{isOpen && (
				<div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
					{languages.map(lang => (
						<button
							key={lang.code}
							onClick={() => switchLanguage(lang.code)}
							className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
								currentLang === lang.code ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700"
							}`}
						>
							<div className="flex items-center justify-between">
								<span>{lang.label}</span>
								{currentLang === lang.code && (
									<span className="text-xs text-gray-500">✓</span>
								)}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
