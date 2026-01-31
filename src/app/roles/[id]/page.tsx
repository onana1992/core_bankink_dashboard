"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
	ArrowLeft,
	KeyRound,
	ShieldCheck,
	Info,
	Pencil,
	X,
	Plus,
	Check,
	AlertCircle,
	Loader2,
	FileQuestion,
	Shield,
	Trash2
} from "lucide-react";
import { rolesApi, permissionsApi } from "@/lib/api";
import type { Role, Permission } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";

export default function RoleDetailPage() {
	const { t } = useTranslation();
	const { showToast } = useToast();
	const params = useParams();
	const router = useRouter();
	const roleId = Number(params.id);
	const [role, setRole] = useState<Role | null>(null);
	const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<Partial<Role>>({});
	const [permissionSearch, setPermissionSearch] = useState("");

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
			setError(e?.message ?? t("role.detail.errors.loadError"));
		} finally {
			setLoading(false);
		}
	}

	async function loadPermissions() {
		try {
			const data = await permissionsApi.listAll();
			setAllPermissions(Array.isArray(data) ? data : []);
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
			setError(e?.message ?? t("role.detail.errors.updateError"));
		} finally {
			setLoading(false);
		}
	}

	async function handleAssignPermissions(permissionIds: number[]) {
		if (!role) return;
		setLoading(true);
		setError(null);
		try {
			await rolesApi.assignPermissions(roleId, { permissionIds });
			await load();
		} catch (e: any) {
			setError(e?.message ?? t("role.detail.errors.assignError"));
		} finally {
			setLoading(false);
		}
	}

	async function handleRevokePermission(permissionId: number) {
		if (!role) return;
		setLoading(true);
		setError(null);
		try {
			await rolesApi.revokePermission(roleId, permissionId);
			await load();
		} catch (e: any) {
			setError(e?.message ?? t("role.detail.errors.revokeError"));
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete() {
		if (!role) return;
		if (!window.confirm(t("role.detail.deleteConfirm"))) return;
		setLoading(true);
		setError(null);
		try {
			await rolesApi.delete(roleId);
			router.push("/roles");
		} catch (e: any) {
			const message = e?.message ?? t("role.detail.errors.deleteError");
			showToast(message, "error");
		} finally {
			setLoading(false);
		}
	}

	const allPermissionsList = Array.isArray(allPermissions) ? allPermissions : [];
	const availablePermissions = allPermissionsList.filter(
		(p) =>
			!role?.permissions?.some((rp) => rp.id === p.id) &&
			(p.name?.toLowerCase().includes(permissionSearch.toLowerCase()) ?? true)
	);

	if (loading && !role) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="text-center">
					<Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
					<p className="mt-4 text-gray-600 font-medium">{t("common.loading")}</p>
				</div>
			</div>
		);
	}

	if (!role) {
		return (
			<div className="space-y-6">
				<div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md mx-auto">
					<div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
						<FileQuestion className="w-8 h-8 text-gray-400" />
					</div>
					<p className="text-gray-700 text-lg font-semibold">{t("role.detail.notFound")}</p>
					<p className="text-gray-500 text-sm mt-1">{t("role.detail.notFoundHint")}</p>
					<Link href="/roles" className="mt-6 inline-flex">
						<Button variant="outline" className="gap-2">
							<ArrowLeft className="w-4 h-4" />
							{t("role.detail.backToList")}
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent px-6 py-5 sm:px-8 sm:py-6">
					<Link
						href="/roles"
						className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-4"
					>
						<ArrowLeft className="w-4 h-4" />
						{t("role.detail.backToList")}
					</Link>
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div className="flex items-start gap-4">
							<div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
								<KeyRound className="w-7 h-7 text-indigo-600" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
									{editing ? (
										<Input
											value={form.name || ""}
											onChange={(e) => setForm({ ...form, name: e.target.value })}
											className="text-2xl font-bold max-w-xs"
										/>
									) : (
										role.name
									)}
								</h1>
								<p className="text-gray-500 mt-1">{t("role.detail.title")}</p>
								{role.id && (
									<span className="inline-block mt-2 text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
										ID {role.id}
									</span>
								)}
							</div>
						</div>
						<div className="flex gap-2 shrink-0">
							{editing ? (
								<>
									<Button
										variant="outline"
										onClick={() => {
											setEditing(false);
											load();
										}}
										className="gap-2"
									>
										<X className="w-4 h-4" />
										{t("role.detail.cancel")}
									</Button>
									<Button onClick={handleUpdate} disabled={loading} className="gap-2">
										{loading ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Check className="w-4 h-4" />
										)}
										{t("role.detail.save")}
									</Button>
								</>
							) : (
								<>
									<Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
										<Pencil className="w-4 h-4" />
										{t("role.detail.edit")}
									</Button>
									<Button
										variant="outline"
										onClick={handleDelete}
										disabled={loading}
										className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
									>
										{loading ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Trash2 className="w-4 h-4" />
										)}
										{t("role.detail.delete")}
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
					<AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
					<span className="font-medium">{error}</span>
				</div>
			)}

			{/* Contenu */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Informations */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
								<Info className="w-5 h-5 text-indigo-600" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">
									{t("role.detail.information")}
								</h2>
								<p className="text-xs text-gray-500 mt-0.5">Nom et description du rôle</p>
							</div>
						</div>
					</div>
					<div className="p-5 space-y-3">
						{!editing && (
							<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
								<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
									{t("role.detail.name")}
								</label>
								<p className="font-semibold text-gray-900">{role.name}</p>
							</div>
						)}
						<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
							<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
								{t("role.detail.description")}
							</label>
							{editing ? (
								<textarea
									className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									value={form.description || ""}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={4}
									placeholder={t("role.detail.descriptionPlaceholder")}
								/>
							) : (
								<p className="text-gray-700 leading-relaxed">
									{role.description || (
										<span className="text-gray-400 italic">{t("role.detail.noDescription")}</span>
									)}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Permissions */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden lg:row-span-2">
					<div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
						<div className="flex items-center gap-2">
							<ShieldCheck className="w-5 h-5 text-indigo-600" />
							<h2 className="text-lg font-semibold text-gray-900">
								{t("role.detail.permissions")}
							</h2>
							{role.permissions && role.permissions.length > 0 && (
								<Badge variant="info" className="ml-auto">
									{role.permissions.length}
								</Badge>
							)}
						</div>
					</div>
					<div className="p-6 space-y-6">
						{/* Permissions assignées */}
						<div>
							<h3 className="text-sm font-medium text-gray-700 mb-3">
								{t("role.detail.assignedPermissions")}
							</h3>
							{role.permissions && role.permissions.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{role.permissions.map((permission) => (
										<div
											key={permission.id}
											className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 rounded-lg pl-3 pr-1 py-1.5 border border-indigo-100"
										>
											<Shield className="w-3.5 h-3.5 text-indigo-600" />
											<span className="text-sm font-medium">{permission.name}</span>
											<button
												type="button"
												onClick={() => handleRevokePermission(permission.id)}
												disabled={loading}
												className="p-1 rounded-md hover:bg-indigo-200/80 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
												title={t("role.detail.revoke")}
											>
												<X className="w-4 h-4" />
											</button>
										</div>
									))}
								</div>
							) : (
								<div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center">
									<Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
									<p className="text-gray-500 text-sm font-medium">
										{t("role.detail.noPermissionsAssigned")}
									</p>
									<p className="text-gray-400 text-xs mt-1">
										{t("role.detail.addBelow")}
									</p>
								</div>
							)}
						</div>

						{/* Assigner des permissions */}
						<div className="pt-4 border-t border-gray-200">
							<h3 className="text-sm font-medium text-gray-700 mb-3">
								{t("role.detail.assignPermissions")}
							</h3>
							{availablePermissions.length > 0 ? (
								<>
									<Input
										placeholder={t("role.detail.searchPermissions", "Search permissions...")}
										value={permissionSearch}
										onChange={(e) => setPermissionSearch(e.target.value)}
										className="mb-3"
									/>
									<div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
										{availablePermissions.map((permission) => (
											<label
												key={permission.id}
												className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
											>
												<input
													type="checkbox"
													onChange={(e) => {
														if (e.target.checked) {
															const currentIds = role.permissions?.map((p) => p.id) || [];
															handleAssignPermissions([...currentIds, permission.id]);
														}
													}}
													disabled={loading}
													className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-4"
												/>
												<span className="text-sm text-gray-700">{permission.name}</span>
												<Plus className="w-4 h-4 text-gray-400 ml-auto" />
											</label>
										))}
									</div>
								</>
							) : (
								<div className="rounded-xl border border-gray-200 bg-gray-50/50 py-6 text-center">
									<Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
									<p className="text-gray-600 text-sm font-medium">
										{allPermissionsList.length === 0
											? t("role.detail.noPermissionsAvailable")
											: t("role.detail.allPermissionsAssigned")}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
