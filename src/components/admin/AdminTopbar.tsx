"use client";

import { PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AdminTopbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
	// Force re-render when language changes by using i18n.language as dependency
	const { t, i18n } = useTranslation();

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
					<LanguageSwitcher />
				</div>
			</div>
		</header>
	);
}
