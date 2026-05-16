"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher({ buttonClassName }: { buttonClassName?: string }) {
	const { i18n } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [currentLang, setCurrentLang] = useState(i18n.language || "en");
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

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
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-gray-300 hover:bg-gray-50",
					buttonClassName
				)}
				aria-label="Switch language"
				aria-expanded={isOpen}
			>
				<Globe className="h-4 w-4 shrink-0 text-slate-600" />
				{/* Libellé uniquement après hydratation : évite tout écart SSR/client (i18n, détecteur, stockage). */}
				{mounted && (
					<>
						<span className="text-sm font-medium text-gray-700 hidden sm:inline">{currentLanguage.label}</span>
						<span className="text-sm font-medium text-gray-700 sm:hidden">{currentLanguage.code.toUpperCase()}</span>
					</>
				)}
			</button>
			{isOpen && (
				<div className="absolute right-0 z-[100] mt-1.5 w-44 overflow-hidden rounded-lg border border-slate-200/90 bg-white py-1 shadow-lg shadow-slate-200/40">
					{languages.map(lang => (
						<button
							key={lang.code}
							onClick={() => switchLanguage(lang.code)}
							className={`w-full px-3 py-2 text-left text-sm transition-colors ${
								currentLang === lang.code
									? "bg-slate-100 font-medium text-slate-900"
									: "text-slate-700 hover:bg-slate-50"
							}`}
						>
							<div className="flex items-center justify-between">
								<span>{lang.label}</span>
								{currentLang === lang.code && (
									<span className="text-xs text-slate-500">✓</span>
								)}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
