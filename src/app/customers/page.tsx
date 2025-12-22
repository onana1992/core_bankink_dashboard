"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { customersApi } from "@/lib/api";
import type { Customer } from "@/types";

export default function CustomersPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [page, setPage] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const size = 20;

	// Filtres
	const [q, setQ] = useState("");
	const [filterStatus, setFilterStatus] = useState<
		"ALL" | "DRAFT" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED"
	>("ALL");
	const [filterType, setFilterType] = useState<"ALL" | "PERSON" | "BUSINESS">("ALL");

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const response = await customersApi.list({
				type: filterType !== "ALL" ? filterType : undefined,
				status: filterStatus !== "ALL" ? filterStatus : undefined,
				search: q.trim() || undefined,
				page,
				size
			});
			setCustomers(response.content);
			setTotalPages(response.totalPages);
			setTotalElements(response.totalElements);
		} catch (e: any) {
			setError(e?.message ?? t("customer.errors.unknown"));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [page, filterStatus, filterType, q]);

	const stats = useMemo(() => {
		const total = customers.length;
		const by: Record<string, number> = {};
		for (const c of customers) {
			by[c.status] = (by[c.status] ?? 0) + 1;
		}
		return {
			total,
			draft: by["DRAFT"] ?? 0,
			pending: by["PENDING_REVIEW"] ?? 0,
			verified: by["VERIFIED"] ?? 0,
			rejected: by["REJECTED"] ?? 0,
			blocked: by["BLOCKED"] ?? 0
		};
	}, [customers]);

	function statusBadgeVariant(status: Customer["status"]): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (status) {
			case "VERIFIED":
				return "success";
			case "DRAFT":
				return "warning";
			case "REJECTED":
			case "BLOCKED":
				return "danger";
			case "PENDING_REVIEW":
			default:
				return "info";
		}
	}

	function riskBadgeVariant(score?: number | null): "neutral" | "success" | "warning" | "danger" {
		if (typeof score !== "number") return "neutral";
		if (score >= 70) return "danger";
		if (score >= 40) return "warning";
		return "success";
	}

	// Les filtres sont maintenant gérés côté serveur, donc on utilise directement customers
	const filteredCustomers = customers;

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("common.customers")}</h1>
					<p className="text-gray-600 mt-1">{t("customer.description")}</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={load} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Link href="/customers/new">
						<Button className="flex items-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							{t("customer.new")}
						</Button>
					</Link>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("customer.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">{t("customer.stats.drafts")}</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.draft}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-sky-50 to-sky-100 p-5 rounded-xl shadow-sm border border-sky-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-sky-700 mb-1">{t("customer.stats.pending")}</div>
							<div className="text-3xl font-bold text-sky-900">{stats.pending}</div>
						</div>
						<div className="w-12 h-12 bg-sky-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">{t("customer.stats.verified")}</div>
							<div className="text-3xl font-bold text-green-900">{stats.verified}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">{t("customer.stats.rejected")}</div>
							<div className="text-3xl font-bold text-red-900">{stats.rejected}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl shadow-sm border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-slate-700 mb-1">{t("customer.stats.blocked")}</div>
							<div className="text-3xl font-bold text-slate-900">{stats.blocked}</div>
						</div>
						<div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.filters.title")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.filters.search")}</label>
						<div className="relative">
							<Input
								placeholder={t("customer.filters.searchPlaceholder")}
								value={q}
								onChange={(e) => {
									setQ(e.target.value);
									setPage(0); // Reset to first page when search changes
								}}
								className="pl-10"
							/>
							<svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.filters.status")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => {
								setFilterStatus(e.target.value as typeof filterStatus);
								setPage(0); // Reset to first page when filter changes
							}}
						>
							<option value="ALL">{t("common.all")}</option>
							<option value="DRAFT">{t("customer.statuses.DRAFT")}</option>
							<option value="PENDING_REVIEW">{t("customer.statuses.PENDING_REVIEW")}</option>
							<option value="VERIFIED">{t("customer.statuses.VERIFIED")}</option>
							<option value="REJECTED">{t("customer.statuses.REJECTED")}</option>
							<option value="BLOCKED">{t("customer.statuses.BLOCKED")}</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.filters.type")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterType}
							onChange={(e) => {
								setFilterType(e.target.value as typeof filterType);
								setPage(0); // Reset to first page when filter changes
							}}
						>
							<option value="ALL">{t("common.all")}</option>
							<option value="PERSON">{t("customer.types.PERSON")}</option>
							<option value="BUSINESS">{t("customer.types.BUSINESS")}</option>
						</select>
					</div>
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

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">{t("common.loading")}</p>
				</div>
			) : filteredCustomers.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("customer.table.noCustomers")}</p>
					<p className="text-gray-400 text-sm mt-2">{t("customer.table.noCustomersHint")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.id")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.name")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.type")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.status")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.email")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.risk")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("customer.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredCustomers.map(c => (
									<tr key={c.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{c.id}</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link href={`/customers/${c.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
												{c.displayName}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{t(`customer.types.${c.type}`)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={statusBadgeVariant(c.status)}>{t(`customer.statuses.${c.status}`)}</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{c.email ?? "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{typeof c.riskScore === "number" ? (
												<Badge variant={riskBadgeVariant(c.riskScore)}>{c.riskScore}</Badge>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/customers/${c.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("customer.table.view")}
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(filteredCustomers.length > 0 || totalElements > 0) && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
							<p className="text-sm text-gray-600">
								{t("customer.table.pagination.showing")} <span className="font-semibold">{filteredCustomers.length}</span> {t("customer.table.pagination.of")} <span className="font-semibold">{totalElements}</span> {totalElements > 1 ? t("customer.table.pagination.customersPlural") : t("customer.table.pagination.customers")}
							</p>
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
										{t("customer.table.pagination.page")} {page + 1} {t("customer.table.pagination.on")} {totalPages}
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
