"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
	const [collapsed, setCollapsed] = useState(false);
	return (
		<div className="min-h-screen bg-gray-50 text-gray-900">
			<div className="flex">
				<AdminSidebar collapsed={collapsed} />
				<div className="flex-1 min-w-0">
					<AdminTopbar onToggleSidebar={() => setCollapsed(v => !v)} />
					<main className="p-6">{children}</main>
				</div>
			</div>
		</div>
	);
}

