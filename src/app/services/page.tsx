"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { servicesApi } from "@/lib/api";
import type { ServiceRegistry, ServiceStatus } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TablePagination from "@/components/ui/TablePagination";
import { Server, RefreshCw, Plus, Filter, Eye, Trash2, AlertCircle, Box } from "lucide-react";

const DEFAULT_PAGE_SIZE = 20;

export default function ServicesPage() {
	const { t } = useTranslation();
	const { isAuthenticated } = useAuth();
	const [loading, setLoading] = useState(false);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [services, setServices] = useState<ServiceRegistry[]>([]);
	const [totalElements, setTotalElements] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [currentPage, setCurrentPage] = useState(0);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [filterStatus, setFilterStatus] = useState<"ALL" | ServiceStatus>("ALL");

	const stats = useMemo(() => {
		const list = services ?? [];
		const by: Record<string, number> = {};
		for (const s of list) {
			by[s.status] = (by[s.status] ?? 0) + 1;
		}
		return {
			total: totalElements,
			active: by["ACTIVE"] ?? 0,
			inactive: by["INACTIVE"] ?? 0,
			revoked: by["REVOKED"] ?? 0
		};
	}, [services, totalElements]);

	useEffect(() => {
		if (isAuthenticated) load(0);
	}, [isAuthenticated, filterStatus, pageSize]);

	function goToPage(page: number) {
		if (page < 0 || page >= totalPages) return;
		load(page);
	}

	async function load(page: number) {
		setLoading(true);
		setError(null);
		try {
			const res = await servicesApi.list({
				...(filterStatus !== "ALL" && { status: filterStatus }),
				page,
				size: pageSize
			});
			setServices(res.content ?? []);
			setTotalElements(res.totalElements ?? 0);
			setTotalPages(res.totalPages ?? 0);
			setCurrentPage(res.number ?? 0);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : t("service.errors.loadError"));
		} finally {
			setLoading(false);
		}
	}

	function statusVariant(s: ServiceStatus): "success" | "neutral" | "danger" {
		switch (s) {
			case "ACTIVE": return "success";
			case "REVOKED": return "danger";
			default: return "neutral";
		}
	}

	async function handleDelete(s: ServiceRegistry) {
		if (!confirm(t("service.delete.confirm", { name: s.name }))) return;
		setDeletingId(s.id);
		setError(null);
		try {
			await servicesApi.delete(s.id);
			load(currentPage);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : t("service.errors.deleteError"));
		} finally {
			setDeletingId(null);
		}
	}

	if (!isAuthenticated) return null;

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
						<Server className="h-6 w-6" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("service.title")}</h1>
						<p className="mt-0.5 text-sm text-slate-500">{t("service.description")}</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => load(currentPage)} className="flex items-center gap-2">
						<RefreshCw className="h-4 w-4" />
						{t("common.refresh")}
					</Button>
					<Link href="/services/new">
						<Button className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800">
							<Plus className="h-4 w-4" />
							{t("service.new")}
						</Button>
					</Link>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
					<AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
					<span>{error}</span>
				</div>
			)}

			{/* Cartes statistiques */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-slate-600">{t("common.all")}</p>
							<p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
							<Server className="h-5 w-5" />
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-emerald-700">{t("service.statuses.ACTIVE")}</p>
							<p className="mt-1 text-2xl font-bold text-emerald-900">{stats.active}</p>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-200/80 text-emerald-700">
							<Box className="h-5 w-5" />
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-slate-600">{t("service.statuses.INACTIVE")}</p>
							<p className="mt-1 text-2xl font-bold text-slate-900">{stats.inactive}</p>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
							<Box className="h-5 w-5" />
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-rose-700">{t("service.statuses.REVOKED")}</p>
							<p className="mt-1 text-2xl font-bold text-rose-900">{stats.revoked}</p>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-200/80 text-rose-700">
							<Trash2 className="h-5 w-5" />
						</div>
					</div>
				</div>
			</div>

			{/* Filtres */}
			<div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<Filter className="h-5 w-5 text-slate-500" />
					<h2 className="text-base font-semibold text-slate-900">{t("common.status")}</h2>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<select
						className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
						value={filterStatus}
						onChange={(e) => setFilterStatus(e.target.value as "ALL" | ServiceStatus)}
					>
						<option value="ALL">{t("common.all")}</option>
						<option value="ACTIVE">{t("service.statuses.ACTIVE")}</option>
						<option value="INACTIVE">{t("service.statuses.INACTIVE")}</option>
						<option value="REVOKED">{t("service.statuses.REVOKED")}</option>
					</select>
				</div>
			</div>

			{/* Tableau */}
			<div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
				{loading ? (
					<div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
						<RefreshCw className="h-8 w-8 animate-spin" />
						<p className="text-sm font-medium">{t("common.loading")}</p>
					</div>
				) : services.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
							<Server className="h-8 w-8" />
						</div>
						<div className="text-center">
							<p className="font-medium text-slate-700">{t("service.table.noServices")}</p>
							<p className="mt-1 text-sm text-slate-500">{t("service.table.noServicesHint")}</p>
						</div>
						<Link href="/services/new">
							<Button className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800">
								<Plus className="h-4 w-4" />
								{t("service.new")}
							</Button>
						</Link>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-slate-200">
								<thead className="bg-slate-50/80">
									<tr>
										<th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											{t("service.table.name")}
										</th>
										<th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											{t("service.table.slug")}
										</th>
										<th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											{t("common.status")}
										</th>
										<th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
											{t("service.table.actions")}
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 bg-white text-sm">
									{services.map((s) => (
										<tr key={s.id} className="transition-colors hover:bg-slate-50/70">
											<td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium text-slate-900">{s.name}</td>
											<td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-slate-600">{s.slug}</td>
											<td className="px-5 py-3.5">
												<Badge variant={statusVariant(s.status)}>{t(`service.statuses.${s.status}`)}</Badge>
											</td>
											<td className="whitespace-nowrap px-5 py-3.5 text-right">
												<div className="flex items-center justify-end gap-2">
													<Link href={`/services/${s.id}`}>
														<Button variant="outline" size="sm" className="gap-1.5">
															<Eye className="h-3.5 w-3.5" />
															{t("service.table.view")}
														</Button>
													</Link>
													<Button
														variant="outline"
														size="sm"
														className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50"
														onClick={() => handleDelete(s)}
														disabled={deletingId === s.id}
													>
														{deletingId === s.id ? (
															<RefreshCw className="h-3.5 w-3.5 animate-spin" />
														) : (
															<Trash2 className="h-3.5 w-3.5" />
														)}
														{t("service.table.delete")}
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<TablePagination
							page={currentPage}
							totalPages={totalPages}
							totalElements={totalElements}
							pageSize={pageSize}
							onPageChange={goToPage}
							resultsLabel={t("service.title").toLowerCase()}
							showFirstLast
							sizeOptions={[10, 20, 50]}
							size={pageSize}
							onSizeChange={(s) => { setPageSize(s); load(0); }}
						/>
					</>
				)}
			</div>
		</div>
	);
}
