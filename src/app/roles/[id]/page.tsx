"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { rolesApi, permissionsApi } from "@/lib/api";
import type { Role, Permission } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function RoleDetailPage() {
	const params = useParams();
	const router = useRouter();
	const roleId = Number(params.id);
	const [role, setRole] = useState<Role | null>(null);
	const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<Partial<Role>>({});

	useEffect(() => {
		if (roleId) {
			load();
			loadPermissions();
		}
	}, [roleId]);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await rolesApi.get(roleId);
			setRole(data);
			setForm({
				name: data.name,
				description: data.description || ""
			});
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement du rôle");
		} finally {
			setLoading(false);
		}
	}

	async function loadPermissions() {
		try {
			const data = await permissionsApi.list();
			setAllPermissions(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des permissions:", e);
		}
	}

	async function handleUpdate() {
		if (!role) return;
		setLoading(true);
		setError(null);
		try {
			await rolesApi.update(roleId, {
				name: form.name,
				description: form.description || null
			});
			setEditing(false);
			await load();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la mise à jour");
		} finally {
			setLoading(false);
		}
	}

	async function handleAssignPermissions(permissionIds: number[]) {
		if (!role) return;
		try {
			await rolesApi.assignPermissions(roleId, { permissionIds });
			await load();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'assignation des permissions");
		}
	}

	async function handleRevokePermission(permissionId: number) {
		if (!role) return;
		try {
			await rolesApi.revokePermission(roleId, permissionId);
			await load();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la révocation de la permission");
		}
	}

	if (loading && !role) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (!role) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500">Rôle non trouvé</p>
				<Link href="/roles">
					<Button variant="outline" className="mt-4">Retour à la liste</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link href="/roles" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
						← Retour à la liste
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">{role.name}</h1>
					<p className="text-gray-600 mt-1">Détails du rôle</p>
				</div>
				{editing ? (
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => { setEditing(false); load(); }}>
							Annuler
						</Button>
						<Button onClick={handleUpdate} disabled={loading}>
							Enregistrer
						</Button>
					</div>
				) : (
					<Button variant="outline" onClick={() => setEditing(true)}>
						Modifier
					</Button>
				)}
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
							<p className="font-mono text-sm">{role.id}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
							{editing ? (
								<Input
									value={form.name || ""}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
								/>
							) : (
								<p className="font-medium">{role.name}</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
							{editing ? (
								<textarea
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
									value={form.description || ""}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={3}
								/>
							) : (
								<p>{role.description || "-"}</p>
							)}
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
					<div className="space-y-3 mb-4">
						{role.permissions && role.permissions.length > 0 ? (
							role.permissions.map(permission => (
								<div key={permission.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
									<Badge className="bg-green-100 text-green-800">{permission.name}</Badge>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleRevokePermission(permission.id)}
									>
										Retirer
									</Button>
								</div>
							))
						) : (
							<p className="text-gray-400 text-sm">Aucune permission assignée</p>
						)}
					</div>
					<div className="pt-4 border-t">
						<label className="block text-sm font-medium text-gray-700 mb-2">Assigner des permissions</label>
						<div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
							{allPermissions
								.filter(p => !role.permissions?.some(rp => rp.id === p.id))
								.map(permission => (
									<label key={permission.id} className="flex items-center space-x-2">
										<input
											type="checkbox"
											onChange={(e) => {
												if (e.target.checked) {
													const currentIds = role.permissions?.map(p => p.id) || [];
													handleAssignPermissions([...currentIds, permission.id]);
												}
											}}
											className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
										/>
										<span className="text-sm">{permission.name}</span>
									</label>
								))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}



