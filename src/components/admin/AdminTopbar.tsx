"use client";

import { PanelLeft, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Button from "@/components/ui/Button";

export default function AdminTopbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
	// Force re-render when language changes by using i18n.language as dependency
	const { t, i18n } = useTranslation();
	const { logout, user } = useAuth();

	async function handleLogout() {
		try {
			await logout();
		} catch (e) {
			// Ignorer les erreurs lors du logout
		}
		// Utiliser window.location.href pour forcer une navigation complète
		window.location.href = "/login";
	}

	return (
		<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
			<div className="flex items-center justify-between gap-3 p-4">
				<div className="flex items-center gap-3">
					<button
						aria-label={t("topbar.toggleSidebar")}
						onClick={onToggleSidebar}
						className="inline-flex items-center justify-center h-9 w-9 rounded-md border hover:bg-gray-50 transition-colors"
					>
						<PanelLeft className="h-4 w-4 text-gray-700" />
					</button>
				</div>
				<div className="flex items-center gap-3">
					{user && (
						<span className="text-sm text-gray-700 hidden md:block">
							{user.username}
						</span>
					)}
					<LanguageSwitcher />
					<Button
						variant="outline"
						size="sm"
						onClick={handleLogout}
						className="flex items-center gap-2"
					>
						<LogOut className="h-4 w-4" />
						<span className="hidden md:inline">Déconnexion</span>
					</Button>
				</div>
			</div>
		</header>
	);
}
