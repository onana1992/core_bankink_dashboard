"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usersApi, rolesApi } from "@/lib/api";
import type { CreateUserRequest, Role, UserStatus } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function NewUserPage() {
	const router = useRouter();
	const [form, setForm] = useState<CreateUserRequest>({
		username: "",
		email: "",
		password: "",
		firstName: "",
		lastName: "",
		status: "ACTIVE",
		roleIds: []
	});
	const [roles, setRoles] = useState<Role[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadRoles();
	}, []);

	async function loadRoles() {
		try {
			const data = await rolesApi.list();
			setRoles(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des rôles:", e);
		}
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			await usersApi.create(form);
			router.push("/users");
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la création de l'utilisateur");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Nouvel utilisateur</h1>
					<p className="text-gray-600 mt-1">Créer un nouveau compte utilisateur</p>
				</div>
				<Link href="/users">
					<Button variant="outline">Annuler</Button>
				</Link>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Username <span className="text-red-500">*</span>
						</label>
						<Input
							value={form.username}
							onChange={(e) => setForm({ ...form, username: e.target.value })}
							required
							placeholder="username"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Email <span className="text-red-500">*</span>
						</label>
						<Input
							type="email"
							value={form.email}
							onChange={(e) => setForm({ ...form, email: e.target.value })}
							required
							placeholder="email@example.com"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Mot de passe <span className="text-red-500">*</span>
						</label>
						<Input
							type="password"
							value={form.password}
							onChange={(e) => setForm({ ...form, password: e.target.value })}
							required
							placeholder="Minimum 8 caractères"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={form.status}
							onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
						>
							<option value="ACTIVE">Actif</option>
							<option value="INACTIVE">Inactif</option>
							<option value="LOCKED">Verrouillé</option>
							<option value="EXPIRED">Expiré</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
						<Input
							value={form.firstName || ""}
							onChange={(e) => setForm({ ...form, firstName: e.target.value })}
							placeholder="Prénom"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
						<Input
							value={form.lastName || ""}
							onChange={(e) => setForm({ ...form, lastName: e.target.value })}
							placeholder="Nom"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Rôles</label>
					<div className="space-y-2">
						{roles.map(role => (
							<label key={role.id} className="flex items-center space-x-2">
								<input
									type="checkbox"
									checked={form.roleIds?.includes(role.id) || false}
									onChange={(e) => {
										const roleIds = form.roleIds || [];
										if (e.target.checked) {
											setForm({ ...form, roleIds: [...roleIds, role.id] });
										} else {
											setForm({ ...form, roleIds: roleIds.filter(id => id !== role.id) });
										}
									}}
									className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<span>{role.name}</span>
							</label>
						))}
					</div>
				</div>

				<div className="flex justify-end gap-3">
					<Link href="/users">
						<Button type="button" variant="outline">Annuler</Button>
					</Link>
					<Button type="submit" disabled={submitting}>
						{submitting ? "Création..." : "Créer l'utilisateur"}
					</Button>
				</div>
			</form>
		</div>
	);
}





















