"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { rolesApi, permissionsApi } from "@/lib/api";
import type { CreateRoleRequest, Permission } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function NewRolePage() {
	const router = useRouter();
	const [form, setForm] = useState<CreateRoleRequest>({
		name: "",
		description: "",
		permissionIds: []
	});
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadPermissions();
	}, []);

	async function loadPermissions() {
		try {
			const data = await permissionsApi.list();
			setPermissions(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des permissions:", e);
		}
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			await rolesApi.create(form);
			router.push("/roles");
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la création du rôle");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Nouveau rôle</h1>
					<p className="text-gray-600 mt-1">Créer un nouveau rôle</p>
				</div>
				<Link href="/roles">
					<Button variant="outline">Annuler</Button>
				</Link>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Nom <span className="text-red-500">*</span>
					</label>
					<Input
						value={form.name}
						onChange={(e) => setForm({ ...form, name: e.target.value })}
						required
						placeholder="ADMIN, OPERATOR, etc."
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
					<textarea
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						value={form.description || ""}
						onChange={(e) => setForm({ ...form, description: e.target.value })}
						rows={3}
						placeholder="Description du rôle"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
					<div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4 space-y-2">
						{permissions.map(permission => (
							<label key={permission.id} className="flex items-center space-x-2">
								<input
									type="checkbox"
									checked={form.permissionIds?.includes(permission.id) || false}
									onChange={(e) => {
										const permissionIds = form.permissionIds || [];
										if (e.target.checked) {
											setForm({ ...form, permissionIds: [...permissionIds, permission.id] });
										} else {
											setForm({ ...form, permissionIds: permissionIds.filter(id => id !== permission.id) });
										}
									}}
									className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<span className="text-sm">{permission.name}</span>
							</label>
						))}
					</div>
				</div>

				<div className="flex justify-end gap-3">
					<Link href="/roles">
						<Button type="button" variant="outline">Annuler</Button>
					</Link>
					<Button type="submit" disabled={submitting}>
						{submitting ? "Création..." : "Créer le rôle"}
					</Button>
				</div>
			</form>
		</div>
	);
}

















