"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { paymentMethodsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";
import type { PaymentMethod } from "@/types";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function PaymentMethodsCatalogPage() {
	const { t } = useTranslation();
	const [items, setItems] = useState<PaymentMethod[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<PaymentMethod | null>(null);
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

	async function load() {
		setLoading(true);
		try {
			const data = await paymentMethodsApi.list();
			setItems(data);
		} catch (e: unknown) {
			showToast(e instanceof Error ? e.message : t("paymentMethodsCatalogPage.loading"), "error");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	const stats = useMemo(() => {
		const active = items.filter((m) => m.isActive).length;
		return { total: items.length, active, inactive: items.length - active };
	}, [items]);

	const filteredItems = useMemo(() => {
		const q = search.trim().toLowerCase();
		return items.filter((m) => {
			if (statusFilter === "ACTIVE" && !m.isActive) return false;
			if (statusFilter === "INACTIVE" && m.isActive) return false;
			if (!q) return true;
			const hay = `${m.code} ${m.name}`.toLowerCase();
			return hay.includes(q);
		});
	}, [items, search, statusFilter]);

	function openCreate() {
		setEditing(null);
		setCode("");
		setName("");
		setIsActive(true);
		setShowForm(true);
	}

	function openEdit(m: PaymentMethod) {
		setEditing(m);
		setCode(m.code);
		setName(m.name);
		setIsActive(m.isActive);
		setShowForm(true);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		try {
			if (editing) {
				await paymentMethodsApi.update(editing.id, { name, isActive });
			} else {
				await paymentMethodsApi.create({ code, name, isActive });
			}
			setShowForm(false);
			await load();
		} catch (err: unknown) {
			showToast(
				err instanceof Error ? err.message : editing ? t("paymentMethodsCatalogPage.updateError") : t("paymentMethodsCatalogPage.createError"),
				"error"
			);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete(m: PaymentMethod) {
		if (!confirm(t("paymentMethodsCatalogPage.deleteConfirm"))) return;
		try {
			await paymentMethodsApi.delete(m.id);
			await load();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : t("paymentMethodsCatalogPage.deleteError"), "error");
		}
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-sm">
				<div className="absolute right-0 top-0 h-40 w-40 translate-x-8 -translate-y-8 rounded-full bg-violet-200/40 blur-3xl" aria-hidden />
				<div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex gap-4">
						<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/25">
							<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.75}
									d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
								/>
							</svg>
						</div>
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{t("paymentMethodsCatalogPage.title")}</h1>
							<p className="mt-1 max-w-xl text-sm text-gray-600 sm:text-base">{t("paymentMethodsCatalogPage.subtitle")}</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 sm:shrink-0">
						<Button type="button" variant="outline" onClick={load} disabled={loading} className="border-violet-200 bg-white/80 hover:bg-white">
							<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("paymentMethodsCatalogPage.refresh")}
						</Button>
						{!showForm && (
							<Button type="button" onClick={openCreate} className="bg-violet-600 hover:bg-violet-700">
								<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								{t("paymentMethodsCatalogPage.add")}
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/80 p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-violet-800">{t("paymentMethodsCatalogPage.stats.total")}</p>
							<p className="mt-1 text-3xl font-bold text-violet-950">{stats.total}</p>
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-200/80">
							<svg className="h-6 w-6 text-violet-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/80 p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-emerald-800">{t("paymentMethodsCatalogPage.stats.active")}</p>
							<p className="mt-1 text-3xl font-bold text-emerald-950">{stats.active}</p>
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-200/80">
							<svg className="h-6 w-6 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/80 p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-slate-700">{t("paymentMethodsCatalogPage.stats.inactive")}</p>
							<p className="mt-1 text-3xl font-bold text-slate-900">{stats.inactive}</p>
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200/80">
							<svg className="h-6 w-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Formulaire création / édition */}
			{showForm && (
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
						<div className="flex items-center gap-2">
							<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
								<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								</svg>
							</span>
							<h2 className="text-lg font-semibold text-gray-900">{editing ? t("paymentMethodsCatalogPage.edit") : t("paymentMethodsCatalogPage.add")}</h2>
						</div>
						<button
							type="button"
							className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
							onClick={() => setShowForm(false)}
						>
							{t("paymentMethodsCatalogPage.cancel")}
						</button>
					</div>
					<form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
						{!editing && (
							<div className="sm:col-span-1">
								<label className="mb-2 block text-sm font-medium text-gray-700">{t("paymentMethodsCatalogPage.formCode")}</label>
								<Input value={code} onChange={(e) => setCode(e.target.value)} required className="w-full font-mono text-sm" placeholder="ORANGE_MONEY" />
							</div>
						)}
						<div className={editing ? "sm:col-span-2" : "sm:col-span-1"}>
							<label className="mb-2 block text-sm font-medium text-gray-700">{t("paymentMethodsCatalogPage.formName")}</label>
							<Input value={name} onChange={(e) => setName(e.target.value)} required className="w-full" />
						</div>
						<div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 sm:col-span-2">
							<input
								id="pm-active"
								type="checkbox"
								className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
								checked={isActive}
								onChange={(e) => setIsActive(e.target.checked)}
							/>
							<label htmlFor="pm-active" className="cursor-pointer text-sm font-medium text-gray-700">
								{t("paymentMethodsCatalogPage.formActive")}
							</label>
						</div>
						<div className="sm:col-span-2 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
							<Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700">
								{submitting ? t("paymentMethodsCatalogPage.saving") : t("paymentMethodsCatalogPage.save")}
							</Button>
							<Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
								{t("paymentMethodsCatalogPage.cancel")}
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Filtres */}
			<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("paymentMethodsCatalogPage.filters.title")}</h2>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">{t("paymentMethodsCatalogPage.filters.search")}</label>
						<div className="relative">
							<Input
								placeholder={t("paymentMethodsCatalogPage.filters.searchPlaceholder")}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-10"
							/>
							<svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">{t("paymentMethodsCatalogPage.filters.status")}</label>
						<select
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
						>
							<option value="ALL">{t("paymentMethodsCatalogPage.filters.statusAll")}</option>
							<option value="ACTIVE">{t("paymentMethodsCatalogPage.filters.statusActive")}</option>
							<option value="INACTIVE">{t("paymentMethodsCatalogPage.filters.statusInactive")}</option>
						</select>
					</div>
				</div>
			</div>

			{/* Liste */}
			{loading ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
					<p className="mt-4 text-gray-600">{t("paymentMethodsCatalogPage.loading")}</p>
				</div>
			) : filteredItems.length === 0 ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-400">
						<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
					<p className="text-lg font-medium text-gray-900">{items.length === 0 ? t("paymentMethodsCatalogPage.empty.title") : t("paymentMethodsCatalogPage.empty.filteredTitle")}</p>
					<p className="mt-2 text-sm text-gray-500">
						{items.length === 0 ? t("paymentMethodsCatalogPage.empty.message") : t("paymentMethodsCatalogPage.empty.filteredMessage")}
					</p>
					{items.length === 0 && !showForm && (
						<Button type="button" className="mt-6 bg-violet-600 hover:bg-violet-700" onClick={openCreate}>
							{t("paymentMethodsCatalogPage.add")}
						</Button>
					)}
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										{t("paymentMethodsCatalogPage.code")}
									</th>
									<th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										{t("paymentMethodsCatalogPage.name")}
									</th>
									<th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										{t("common.status")}
									</th>
									<th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										{t("common.actions", { defaultValue: "Actions" })}
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 bg-white">
								{filteredItems.map((m) => (
									<tr key={m.id} className="transition-colors hover:bg-violet-50/40">
										<td className="whitespace-nowrap px-6 py-4">
											<span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-800">{m.code}</span>
										</td>
										<td className="px-6 py-4">
											<span className="font-medium text-gray-900">{m.name}</span>
										</td>
										<td className="px-6 py-4">
											<Badge variant={m.isActive ? "success" : "neutral"}>
												{m.isActive ? t("paymentMethodsCatalogPage.active") : t("paymentMethodsCatalogPage.inactive")}
											</Badge>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right">
											<div className="flex justify-end gap-2">
												<Button type="button" variant="outline" size="sm" className="border-gray-300 text-violet-700 hover:bg-violet-50" onClick={() => openEdit(m)}>
													{t("paymentMethodsCatalogPage.edit")}
												</Button>
												<Button type="button" variant="outline" size="sm" className="border-gray-300 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(m)}>
													{t("common.delete")}
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="border-t border-gray-100 bg-gray-50/80 px-6 py-3 text-right text-xs text-gray-500">
						{t("paymentMethodsCatalogPage.listCount", { shown: filteredItems.length, total: items.length })}
					</div>
				</div>
			)}
		</div>
	);
}
