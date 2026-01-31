"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
	ArrowLeft,
	KeyRound,
	ShieldCheck,
	AlertCircle,
	Loader2,
	Plus,
	Check,
	Info
} from "lucide-react";
import { rolesApi, permissionsApi } from "@/lib/api";
import type { CreateRoleRequest, Permission } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function NewRolePage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [form, setForm] = useState<CreateRoleRequest>({
		name: "",
		description: "",
		permissionIds: []
	});
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [permissionSearch, setPermissionSearch] = useState("");

	useEffect(() => {
		loadPermissions();
	}, []);

	async function loadPermissions() {
		setLoading(true);
		try {
			const data = await permissionsApi.listAll();
			setPermissions(Array.isArray(data) ? data : []);
		} catch (e: any) {
			setError(e?.message ?? t("role.new.errors.loadPermissionsError"));
		} finally {
			setLoading(false);
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
			setError(e?.message ?? t("role.new.errors.createError"));
		} finally {
			setSubmitting(false);
		}
	}

	const permissionList = Array.isArray(permissions) ? permissions : [];
	const filteredPermissions = permissionList.filter(
		(p) =>
			!permissionSearch.trim() ||
			(p.name?.toLowerCase().includes(permissionSearch.toLowerCase()) ?? false)
	);

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
						{t("role.new.backToList")}
					</Link>
					<div className="flex items-start gap-4">
						<div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
							<KeyRound className="w-7 h-7 text-indigo-600" />
						</div>
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
								{t("role.new.title")}
							</h1>
							<p className="text-gray-500 mt-1">{t("role.new.description")}</p>
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

			<form onSubmit={onSubmit} className="space-y-6">
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
						<div className="p-5 space-y-4">
							<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
								<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
									{t("role.new.form.name")} <span className="text-red-500">{t("role.new.form.nameRequired")}</span>
								</label>
								<Input
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									required
									placeholder={t("role.new.form.namePlaceholder")}
									className="bg-white"
								/>
							</div>
							<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
								<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
									{t("role.new.form.description")}
								</label>
								<textarea
									className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									value={form.description || ""}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={4}
									placeholder={t("role.new.form.descriptionPlaceholder")}
								/>
							</div>
						</div>
					</div>

					{/* Permissions */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
						<div className="bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60 px-6 py-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
									<ShieldCheck className="w-5 h-5 text-indigo-600" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-gray-900">
										{t("role.new.form.permissions")}
									</h2>
									<p className="text-xs text-gray-500 mt-0.5">
										{form.permissionIds?.length
											? `${form.permissionIds.length} ${form.permissionIds.length > 1 ? t("role.new.form.selectedPlural") : t("role.new.form.selected")}`
											: "Sélectionnez les permissions"}
									</p>
								</div>
								{form.permissionIds && form.permissionIds.length > 0 && (
									<Badge variant="info" className="ml-auto">
										{form.permissionIds.length}
									</Badge>
								)}
							</div>
						</div>
						<div className="p-5 space-y-4">
							{loading ? (
								<div className="rounded-xl border border-gray-200 bg-gray-50/50 py-12 text-center">
									<Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
									<p className="mt-3 text-sm text-gray-600">{t("common.loading")}</p>
								</div>
							) : permissionList.length === 0 ? (
								<div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center">
									<ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
									<p className="text-sm text-gray-500">{t("permission.table.noPermissions")}</p>
								</div>
							) : (
								<>
									<Input
										placeholder={t("role.detail.searchPermissions", "Search permissions...")}
										value={permissionSearch}
										onChange={(e) => setPermissionSearch(e.target.value)}
										className="bg-gray-50/80 border-gray-200"
									/>
									<div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
										{filteredPermissions.map((permission) => {
											const isChecked = form.permissionIds?.includes(permission.id) ?? false;
											return (
												<label
													key={permission.id}
													className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
														isChecked ? "bg-indigo-50" : "hover:bg-gray-50"
													}`}
												>
													<input
														type="checkbox"
														checked={isChecked}
														onChange={(e) => {
															const permissionIds = form.permissionIds || [];
															if (e.target.checked) {
																setForm({ ...form, permissionIds: [...permissionIds, permission.id] });
															} else {
																setForm({
																	...form,
																	permissionIds: permissionIds.filter((id) => id !== permission.id)
																});
															}
														}}
														className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-4"
													/>
													<span className="text-sm font-medium text-gray-800">{permission.name}</span>
													{isChecked && <Check className="w-4 h-4 text-indigo-600 ml-auto shrink-0" />}
												</label>
											);
										})}
										{filteredPermissions.length === 0 && (
											<div className="px-4 py-6 text-center text-sm text-gray-500">
												{t("role.detail.noPermissionsAvailable")}
											</div>
										)}
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
					<Link href="/roles" className="order-2 sm:order-1">
						<Button type="button" variant="outline" className="w-full sm:w-auto gap-2">
							<ArrowLeft className="w-4 h-4" />
							{t("role.new.form.cancel")}
						</Button>
					</Link>
					<Button
						type="submit"
						disabled={submitting}
						className="w-full sm:w-auto gap-2 order-1 sm:order-2"
					>
						{submitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								{t("role.new.form.creating")}
							</>
						) : (
							<>
								<Plus className="w-4 h-4" />
								{t("role.new.form.create")}
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
