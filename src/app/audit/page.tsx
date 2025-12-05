"use client";

import { useEffect, useState } from "react";
import { auditApi, usersApi } from "@/lib/api";
import type { AuditEvent, User } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function AuditPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [events, setEvents] = useState<AuditEvent[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [filters, setFilters] = useState({
		userId: "",
		action: "",
		resourceType: "",
		fromDate: "",
		toDate: ""
	});

	useEffect(() => {
		loadUsers();
		loadEvents();
	}, []);

	useEffect(() => {
		loadEvents();
	}, [filters]);

	async function loadUsers() {
		try {
			const data = await usersApi.list();
			setUsers(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des utilisateurs:", e);
		}
	}

	async function loadEvents() {
		setLoading(true);
		setError(null);
		try {
			const data = await auditApi.getEvents({
				userId: filters.userId ? Number(filters.userId) : undefined,
				action: filters.action || undefined,
				resourceType: filters.resourceType || undefined,
				fromDate: filters.fromDate || undefined,
				toDate: filters.toDate || undefined
			});
			setEvents(data);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des événements");
		} finally {
			setLoading(false);
		}
	}

	function getActionBadge(action: string) {
		const colors: Record<string, string> = {
			LOGIN: "bg-green-100 text-green-800",
			LOGOUT: "bg-gray-100 text-gray-800",
			CREATE: "bg-blue-100 text-blue-800",
			UPDATE: "bg-yellow-100 text-yellow-800",
			DELETE: "bg-red-100 text-red-800",
			READ: "bg-purple-100 text-purple-800"
		};
		return <Badge className={colors[action] || "bg-gray-100 text-gray-800"}>{action}</Badge>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Audit</h1>
				<p className="text-gray-600 mt-1">Consultation des événements d'audit</p>
			</div>

			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<h2 className="text-lg font-semibold text-gray-900 mb-4">Filtres</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md"
							value={filters.userId}
							onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
						>
							<option value="">Tous les utilisateurs</option>
							{users.map(user => (
								<option key={user.id} value={user.id}>{user.username}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md"
							value={filters.action}
							onChange={(e) => setFilters({ ...filters, action: e.target.value })}
						>
							<option value="">Toutes les actions</option>
							<option value="LOGIN">LOGIN</option>
							<option value="LOGOUT">LOGOUT</option>
							<option value="CREATE">CREATE</option>
							<option value="UPDATE">UPDATE</option>
							<option value="DELETE">DELETE</option>
							<option value="READ">READ</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Type de ressource</label>
						<Input
							value={filters.resourceType}
							onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
							placeholder="User, Account, etc."
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
						<Input
							type="datetime-local"
							value={filters.fromDate}
							onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
						<Input
							type="datetime-local"
							value={filters.toDate}
							onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
						/>
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
					<p className="mt-4 text-gray-600">Chargement des événements...</p>
				</div>
			) : events.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<p className="text-gray-500 text-lg font-medium">Aucun événement trouvé</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Utilisateur</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Ressource</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">ID Ressource</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">IP</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{events.map(event => (
									<tr key={event.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											{new Date(event.createdAt).toLocaleString('fr-FR')}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{event.user ? (
												<span className="font-medium">{event.user.username}</span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{getActionBadge(event.action)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className="bg-gray-100 text-gray-800">{event.resourceType}</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
											{event.resourceId || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
											{event.ipAddress || "-"}
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


