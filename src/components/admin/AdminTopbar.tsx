"use client";

import { PanelLeft } from "lucide-react";

export default function AdminTopbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
	return (
		<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
			<div className="flex items-center gap-3 p-4">
				<button
					aria-label="Toggle sidebar"
					onClick={onToggleSidebar}
					className="inline-flex items-center justify-center h-9 w-9 rounded-md border hover:bg-gray-50"
				>
					<PanelLeft className="h-4 w-4 text-gray-700" />
				</button>
			</div>
		</header>
	);
}
