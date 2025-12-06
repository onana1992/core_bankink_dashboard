"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/lib/api";
import type { User, UserStatus } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function UsersPage() {
	const { isAuthenticated } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [filterStatus, setFilterStatus] = useState<"ALL" | UserStatus>("ALL");
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (isAuthenticated) {
			load();
		}
	}, [isAuthenticated, filterStatus]);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await usersApi.list(filterStatus !== "ALL" ? { status: filterStatus } : undefined);
			setUsers(data);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des utilisateurs");
		} finally {
			setLoading(false);
		}
	}

	const filtered = users.filter(u =>
		u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
		u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
		`${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
	);

	function getStatusBadge(status: UserStatus) {
		const colors: Record<UserStatus, string> = {
			ACTIVE: "bg-green-100 text-green-800",
			INACTIVE: "bg-gray-100 text-gray-800",
			LOCKED: "bg-red-100 text-red-800",
			EXPIRED: "bg-yellow-100 text-yellow-800"
		};
		const labels: Record<UserStatus, string> = {
			ACTIVE: "Actif",
			INACTIVE: "Inactif",
			LOCKED: "Verrouillé",
			EXPIRED: "Expiré"
		};
		return <Badge className={colors[status]}>{labels[status]}</Badge>;
	}

	if (!isAuthenticated) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Utilisateurs</h1>
					<p className="text-gray-600 mt-1">Gestion des utilisateurs du système</p>
				</div>
				<Link href="/users/new">
					<Button className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Nouvel utilisateur
					</Button>
				</Link>
			</div>

			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
						<Input
							placeholder="Nom, email, username..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value as "ALL" | UserStatus)}
						>
							<option value="ALL">Tous les statuts</option>
							<option value="ACTIVE">Actif</option>
							<option value="INACTIVE">Inactif</option>
							<option value="LOCKED">Verrouillé</option>
							<option value="EXPIRED">Expiré</option>
						</select>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<p className="text-gray-500 text-lg font-medium">Aucun utilisateur trouvé</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Username</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Nom</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Statut</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Rôles</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filtered.map(user => (
									<tr key={user.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{user.id}</td>
										<td className="px-6 py-4 whitespace-nowrap font-medium">{user.username}</td>
										<td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{user.firstName || user.lastName
												? `${user.firstName || ""} ${user.lastName || ""}`.trim()
												: "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{getStatusBadge(user.status)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{user.roles && user.roles.length > 0 ? (
												<div className="flex flex-wrap gap-1">
													{user.roles.map(role => (
														<Badge key={role.id} className="bg-blue-100 text-blue-800">
															{role.name}
														</Badge>
													))}
												</div>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/users/${user.id}`}>
												<Button variant="outline" size="sm">Voir</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}



