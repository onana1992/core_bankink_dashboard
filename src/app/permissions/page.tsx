"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { permissionsApi } from "@/lib/api";
import type { Permission } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function PermissionsPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [filterResource, setFilterResource] = useState<string>("");
	const [sortBy, setSortBy] = useState("id");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const [resourcesForFilter, setResourcesForFilter] = useState<string[]>([]);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
	const [deletingPermission, setDeletingPermission] = useState<Permission | null>(null);
	const [form, setForm] = useState({
		name: "",
		resource: "",
		action: "",
		description: ""
	});

	useEffect(() => {
		loadPage();
	}, [filterResource, page, size, sortBy, sortDir]);

	useEffect(() => {
		loadResourcesForFilter();
	}, []);

	async function loadResourcesForFilter() {
		try {
			const data = await permissionsApi.list({ page: 0, size: 500 });
			const content = data.content ?? [];
			const resources = Array.from(new Set(content.map((p: Permission) => p.resource)));
			setResourcesForFilter(resources);
		} catch {
			// ignore; filter dropdown may stay empty
		}
	}

	async function loadPage() {
		setLoading(true);
		setError(null);
		try {
			const response = await permissionsApi.list({
				resource: filterResource || undefined,
				page,
				size,
				sortBy,
				sortDir
			});
			setPermissions(response.content ?? []);
			setTotalPages(response.totalPages ?? 0);
			setTotalElements(response.totalElements ?? 0);
		} catch (e: any) {
			setError(e?.message ?? t("permission.errors.loadError"));
		} finally {
			setLoading(false);
		}
	}

	async function load() {
		await loadPage();
		loadResourcesForFilter();
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
			setError(e?.message ?? t("permission.errors.createError"));
		} finally {
			setLoading(false);
		}
	}

	function handleEditClick(permission: Permission) {
		setEditingPermission(permission);
		setForm({
			name: permission.name,
			resource: permission.resource,
			action: permission.action,
			description: permission.description || ""
		});
		setShowEditModal(true);
	}

	async function handleUpdate(e: React.FormEvent) {
		e.preventDefault();
		if (!editingPermission) return;
		setLoading(true);
		setError(null);
		try {
			await permissionsApi.update(editingPermission.id, {
				name: form.name,
				resource: form.resource,
				action: form.action,
				description: form.description || null
			});
			setShowEditModal(false);
			setEditingPermission(null);
			setForm({ name: "", resource: "", action: "", description: "" });
			await load();
		} catch (e: any) {
			setError(e?.message ?? t("permission.errors.updateError"));
		} finally {
			setLoading(false);
		}
	}

	function handleDeleteClick(permission: Permission) {
		setDeletingPermission(permission);
		setShowDeleteModal(true);
	}

	async function handleDeleteConfirm() {
		if (!deletingPermission) return;
		setLoading(true);
		setError(null);
		try {
			await permissionsApi.delete(deletingPermission.id);
			setShowDeleteModal(false);
			setDeletingPermission(null);
			await load();
		} catch (e: any) {
			setError(e?.message ?? t("permission.errors.deleteError"));
		} finally {
			setLoading(false);
		}
	}

	const permissionList = Array.isArray(permissions) ? permissions : [];
	const resourcesInPage = useMemo(() => Array.from(new Set(permissionList.map(p => p.resource))), [permissionList]);
	const stats = useMemo(() => ({
		total: totalElements,
		byResource: resourcesInPage.length
	}), [totalElements, resourcesInPage]);

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("sidebar.permissions")}</h1>
					<p className="text-gray-600 mt-1">{t("permission.description")}</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={load} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						{t("permission.new")}
					</Button>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("permission.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm border border-purple-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-purple-700 mb-1">{t("permission.stats.resources")}</div>
							<div className="text-3xl font-bold text-purple-900">{stats.byResource}</div>
						</div>
						<div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Filtres */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("permission.filters.title")}</h2>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("permission.filters.resource")}</label>
					<select
						className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						value={filterResource}
						onChange={(e) => {
							setFilterResource(e.target.value);
							setPage(0);
						}}
					>
						<option value="">{t("permission.filters.allResources")}</option>
						{resourcesForFilter.map(resource => (
							<option key={resource} value={resource}>{resource}</option>
						))}
					</select>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{/* Modal de création */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
						<h2 className="text-xl font-bold mb-4">{t("permission.new")}</h2>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.name")}</label>
								<Input
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									required
									placeholder={t("permission.form.namePlaceholder")}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.resource")}</label>
								<Input
									value={form.resource}
									onChange={(e) => setForm({ ...form, resource: e.target.value })}
									required
									placeholder={t("permission.form.resourcePlaceholder")}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.action")}</label>
								<Input
									value={form.action}
									onChange={(e) => setForm({ ...form, action: e.target.value })}
									required
									placeholder={t("permission.form.actionPlaceholder")}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.description")}</label>
								<textarea
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={2}
								/>
							</div>
							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
									{t("permission.form.cancel")}
								</Button>
								<Button type="submit" disabled={loading}>
									{t("permission.form.create")}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modal de modification */}
			{showEditModal && editingPermission && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
						<h2 className="text-xl font-bold mb-4">{t("permission.edit")}</h2>
						<form onSubmit={handleUpdate} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.name")}</label>
								<Input
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									required
									placeholder={t("permission.form.namePlaceholder")}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.resource")}</label>
								<Input
									value={form.resource}
									onChange={(e) => setForm({ ...form, resource: e.target.value })}
									required
									placeholder={t("permission.form.resourcePlaceholder")}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.action")}</label>
								<Input
									value={form.action}
									onChange={(e) => setForm({ ...form, action: e.target.value })}
									required
									placeholder={t("permission.form.actionPlaceholder")}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("permission.form.description")}</label>
								<textarea
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={2}
								/>
							</div>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setShowEditModal(false);
										setEditingPermission(null);
										setForm({ name: "", resource: "", action: "", description: "" });
									}}
								>
									{t("permission.form.cancel")}
								</Button>
								<Button type="submit" disabled={loading}>
									{t("common.update")}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modal de confirmation de suppression */}
			{showDeleteModal && deletingPermission && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
						<h2 className="text-xl font-bold mb-4 text-red-600">{t("permission.delete.title")}</h2>
						<p className="text-gray-700 mb-6">
							{t("permission.delete.confirm")} <span className="font-semibold">{deletingPermission.name}</span>?
						</p>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setShowDeleteModal(false);
									setDeletingPermission(null);
								}}
							>
								{t("common.cancel")}
							</Button>
							<Button
								variant="outline"
								onClick={handleDeleteConfirm}
								disabled={loading}
								className="bg-red-600 text-white hover:bg-red-700 border-red-600"
							>
								{t("common.delete")}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">{t("common.loading")}</p>
				</div>
			) : permissionList.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("permission.table.noPermissions")}</p>
					<p className="text-gray-400 text-sm mt-2">{t("permission.table.noPermissionsHint")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("permission.table.id")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("permission.table.name")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("permission.table.resource")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("permission.table.action")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("permission.table.description")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{permissionList.map(permission => (
									<tr key={permission.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{permission.id}</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{permission.name}</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant="info">{permission.resource}</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant="success">{permission.action}</Badge>
										</td>
										<td className="px-6 py-4 text-gray-700">{permission.description || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleEditClick(permission)}
													className="flex items-center gap-1"
												>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
													{t("common.edit")}
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleDeleteClick(permission)}
													className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
												>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													{t("common.delete")}
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(permissionList.length > 0 || totalElements > 0) && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
							<div className="flex items-center gap-4">
								<p className="text-sm text-gray-600">
									{t("permission.table.pagination.showing")} <span className="font-semibold">{permissionList.length}</span> {t("permission.table.pagination.of")} <span className="font-semibold">{totalElements}</span> {totalElements !== 1 ? t("permission.table.pagination.permissions") : t("permission.table.pagination.permission")}
								</p>
								<div className="flex items-center gap-2">
									<label className="text-sm text-gray-600">{t("permission.table.pagination.itemsPerPage")}</label>
									<select
										className="px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
										value={size}
										onChange={(e) => {
											setSize(Number(e.target.value));
											setPage(0);
										}}
									>
										{PAGE_SIZE_OPTIONS.map(n => (
											<option key={n} value={n}>{n}</option>
										))}
									</select>
								</div>
							</div>
							{totalPages > 1 && (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage(p => Math.max(0, p - 1))}
										disabled={page === 0}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
										</svg>
									</Button>
									<span className="text-sm text-gray-600">
										{t("permission.table.pagination.page")} {page + 1} {t("permission.table.pagination.on")} {totalPages}
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
										disabled={page >= totalPages - 1}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</Button>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
