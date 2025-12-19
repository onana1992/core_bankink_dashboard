"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usersApi, rolesApi } from "@/lib/api";
import type { User, Role, UserStatus } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function UserDetailPage() {
	const params = useParams();
	const router = useRouter();
	const userId = Number(params.id);
	const [user, setUser] = useState<User | null>(null);
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<Partial<User>>({});

	useEffect(() => {
		if (userId) {
			load();
			loadRoles();
		}
	}, [userId]);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await usersApi.get(userId);
			setUser(data);
			setForm({
				email: data.email,
				firstName: data.firstName,
				lastName: data.lastName,
				status: data.status
			});
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement de l'utilisateur");
		} finally {
			setLoading(false);
		}
	}

	async function loadRoles() {
		try {
			const data = await rolesApi.list();
			setRoles(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des rôles:", e);
		}
	}

	async function handleUpdate() {
		if (!user) return;
		setLoading(true);
		setError(null);
		try {
			await usersApi.update(userId, {
				email: form.email,
				firstName: form.firstName || null,
				lastName: form.lastName || null,
				status: form.status
			});
			setEditing(false);
			await load();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la mise à jour");
		} finally {
			setLoading(false);
		}
	}

	async function handleAssignRole(roleId: number) {
		if (!user) return;
		try {
			await usersApi.assignRole(userId, { roleId });
			await load();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'assignation du rôle");
		}
	}

	async function handleRevokeRole(roleId: number) {
		if (!user) return;
		try {
			await usersApi.revokeRole(userId, roleId);
			await load();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la révocation du rôle");
		}
	}

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

	if (loading && !user) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500">Utilisateur non trouvé</p>
				<Link href="/users">
					<Button variant="outline" className="mt-4">Retour à la liste</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link href="/users" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
						← Retour à la liste
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">{user.username}</h1>
					<p className="text-gray-600 mt-1">Détails de l'utilisateur</p>
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
							<p className="font-mono text-sm">{user.id}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
							<p className="font-medium">{user.username}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
							{editing ? (
								<Input
									type="email"
									value={form.email || ""}
									onChange={(e) => setForm({ ...form, email: e.target.value })}
								/>
							) : (
								<p>{user.email}</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
							{editing ? (
								<Input
									value={form.firstName || ""}
									onChange={(e) => setForm({ ...form, firstName: e.target.value })}
								/>
							) : (
								<p>{user.firstName || "-"}</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
							{editing ? (
								<Input
									value={form.lastName || ""}
									onChange={(e) => setForm({ ...form, lastName: e.target.value })}
								/>
							) : (
								<p>{user.lastName || "-"}</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
							{editing ? (
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
									value={form.status}
									onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
								>
									<option value="ACTIVE">Actif</option>
									<option value="INACTIVE">Inactif</option>
									<option value="LOCKED">Verrouillé</option>
									<option value="EXPIRED">Expiré</option>
								</select>
							) : (
								getStatusBadge(user.status)
							)}
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Rôles</h2>
					<div className="space-y-3">
						{user.roles && user.roles.length > 0 ? (
							user.roles.map(role => (
								<div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
									<Badge className="bg-blue-100 text-blue-800">{role.name}</Badge>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleRevokeRole(role.id)}
									>
										Retirer
									</Button>
								</div>
							))
						) : (
							<p className="text-gray-400 text-sm">Aucun rôle assigné</p>
						)}
					</div>
					<div className="mt-4 pt-4 border-t">
						<label className="block text-sm font-medium text-gray-700 mb-2">Assigner un rôle</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
							onChange={(e) => {
								if (e.target.value) {
									handleAssignRole(Number(e.target.value));
									e.target.value = "";
								}
							}}
						>
							<option value="">Sélectionner un rôle</option>
							{roles
								.filter(role => !user.roles?.some(r => r.id === role.id))
								.map(role => (
									<option key={role.id} value={role.id}>{role.name}</option>
								))}
						</select>
					</div>
				</div>
			</div>
		</div>
	);
}














