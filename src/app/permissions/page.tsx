"use client";

import { useEffect, useState } from "react";
import { permissionsApi } from "@/lib/api";
import type { Permission } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function PermissionsPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [filterResource, setFilterResource] = useState<string>("");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [form, setForm] = useState({
		name: "",
		resource: "",
		action: "",
		description: ""
	});

	useEffect(() => {
		load();
	}, [filterResource]);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await permissionsApi.list(filterResource ? { resource: filterResource } : undefined);
			setPermissions(data);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des permissions");
		} finally {
			setLoading(false);
		}
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			await permissionsApi.create({
				name: form.name,
				resource: form.resource,
				action: form.action,
				description: form.description || null
			});
			setShowCreateModal(false);
			setForm({ name: "", resource: "", action: "", description: "" });
			await load();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la création de la permission");
		} finally {
			setLoading(false);
		}
	}

	const resources = Array.from(new Set(permissions.map(p => p.resource)));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Permissions</h1>
					<p className="text-gray-600 mt-1">Gestion des permissions du système</p>
				</div>
				<Button onClick={() => setShowCreateModal(true)}>
					Nouvelle permission
				</Button>
			</div>

			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par ressource</label>
				<select
					className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					value={filterResource}
					onChange={(e) => setFilterResource(e.target.value)}
				>
					<option value="">Toutes les ressources</option>
					{resources.map(resource => (
						<option key={resource} value={resource}>{resource}</option>
					))}
				</select>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
						<h2 className="text-xl font-bold mb-4">Nouvelle permission</h2>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Nom (RESOURCE:ACTION)</label>
								<Input
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									required
									placeholder="USERS:CREATE"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Ressource</label>
								<Input
									value={form.resource}
									onChange={(e) => setForm({ ...form, resource: e.target.value })}
									required
									placeholder="USERS"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
								<Input
									value={form.action}
									onChange={(e) => setForm({ ...form, action: e.target.value })}
									required
									placeholder="CREATE"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={2}
								/>
							</div>
							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
									Annuler
								</Button>
								<Button type="submit" disabled={loading}>
									Créer
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement des permissions...</p>
				</div>
			) : permissions.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<p className="text-gray-500 text-lg font-medium">Aucune permission trouvée</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Nom</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Ressource</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{permissions.map(permission => (
									<tr key={permission.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{permission.id}</td>
										<td className="px-6 py-4 whitespace-nowrap font-mono font-medium">{permission.name}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className="bg-blue-100 text-blue-800">{permission.resource}</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className="bg-green-100 text-green-800">{permission.action}</Badge>
										</td>
										<td className="px-6 py-4">{permission.description || "-"}</td>
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














