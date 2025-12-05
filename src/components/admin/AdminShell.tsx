"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
	const [collapsed, setCollapsed] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { isAuthenticated, loading } = useAuth();

	useEffect(() => {
		// Pages publiques qui ne nécessitent pas d'authentification
		const publicPages = ["/login"];
		
		if (!loading && !isAuthenticated && !publicPages.includes(pathname)) {
			router.push("/login");
		}
		
		// Rediriger vers la page d'accueil si déjà authentifié et sur la page de login
		if (!loading && isAuthenticated && pathname === "/login") {
			router.push("/");
		}
	}, [isAuthenticated, loading, pathname, router]);

	// Ne pas afficher le shell sur la page de login
	if (pathname === "/login") {
		return <>{children}</>;
	}

	// Afficher un loader pendant la vérification de l'authentification
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	// Ne pas afficher le shell si non authentifié (sera redirigé)
	if (!isAuthenticated) {
		return null;
	}

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

