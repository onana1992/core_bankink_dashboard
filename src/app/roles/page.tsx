"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rolesApi } from "@/lib/api";
import type { Role } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function RolesPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [roles, setRoles] = useState<Role[]>([]);

	useEffect(() => {
		load();
	}, []);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await rolesApi.list();
			setRoles(data);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des rôles");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Rôles</h1>
					<p className="text-gray-600 mt-1">Gestion des rôles et permissions</p>
				</div>
				<Link href="/roles/new">
					<Button className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Nouveau rôle
					</Button>
				</Link>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement des rôles...</p>
				</div>
			) : roles.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<p className="text-gray-500 text-lg font-medium">Aucun rôle trouvé</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{roles.map(role => (
						<Link key={role.id} href={`/roles/${role.id}`}>
							<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
								<h3 className="text-xl font-semibold text-gray-900 mb-2">{role.name}</h3>
								{role.description && (
									<p className="text-gray-600 text-sm mb-4">{role.description}</p>
								)}
								<div className="flex flex-wrap gap-2">
									{role.permissions && role.permissions.length > 0 ? (
										role.permissions.map(permission => (
											<Badge key={permission.id} className="bg-green-100 text-green-800 text-xs">
												{permission.name}
											</Badge>
										))
									) : (
										<span className="text-gray-400 text-sm">Aucune permission</span>
									)}
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}






















