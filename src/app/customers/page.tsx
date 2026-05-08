"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";
import {
	DomainStatusBadge,
	OpsEmptyState,
	OpsField,
	OpsFilterPanel,
	OpsInlineAlert,
	OpsLoadingState,
	OpsPageHeader,
	OpsTableCard,
	OPS_PAGE_STACK,
	OPS_TD,
	OPS_TH,
	OPS_THEAD,
	OPS_TABLE,
	OPS_TABLE_WRAP,
	OPS_TR_HOVER,
	OpsSelect
} from "@/components/ops";
import { customersApi } from "@/lib/api";
import { customerDetailPath } from "@/lib/customerRoutes";
import {
	compareCustomersWorklist,
	customerDossierAgeDays,
	customerWorklistTier,
	customerWorklistTierLabel,
	type CustomerWorklistSortMode
} from "@/lib/customerWorklistSort";
import { resolveApiExceptionMessage } from "@/lib/resolveApiException";
import type { Customer, CustomerStatus } from "@/types";

function worklistTierChipClass(status: CustomerStatus): string {
	const tier = customerWorklistTier(status);
	if (tier === 1) return "border-rose-200 bg-rose-50 text-rose-900 font-semibold";
	if (tier === 2) return "border-slate-300 bg-slate-100 text-slate-900 font-semibold";
	if (tier === 3) return "border-amber-200 bg-amber-50 text-amber-900 font-medium";
	if (tier === 4) return "border-orange-200 bg-orange-50 text-orange-900 font-medium";
	return "border-emerald-200 bg-emerald-50 text-emerald-900 font-medium";
}

export default function CustomersPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [page, setPage] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [size, setSize] = useState(20);

	// Filtres
	const [q, setQ] = useState("");
	const [filterStatus, setFilterStatus] = useState<
		"ALL" | "DRAFT" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED"
	>("ALL");
	const [filterType, setFilterType] = useState<"ALL" | "PERSON" | "BUSINESS">("ALL");
	const [worklistSort, setWorklistSort] = useState<CustomerWorklistSortMode>("priority");
	const customersFetchGen = useRef(0);
	const lastListFilterSigRef = useRef(`${filterType}|${filterStatus}|${q}`);

	async function load() {
		const seq = ++customersFetchGen.current;
		setLoading(true);
		setError(null);
		try {
			const sig = `${filterType}|${filterStatus}|${q}`;
			if (lastListFilterSigRef.current !== sig) {
				lastListFilterSigRef.current = sig;
				if (page !== 0) {
					setPage(0);
					return;
				}
			}

			const response = await customersApi.list({
				type: filterType !== "ALL" ? filterType : undefined,
				status: filterStatus !== "ALL" ? filterStatus : undefined,
				search: q.trim() || undefined,
				page,
				size
			});
			if (seq !== customersFetchGen.current) return;
			setCustomers(response.content ?? []);
			const te = Number(response.totalElements);
			const tp = Number(response.totalPages);
			setTotalPages(Number.isFinite(tp) && tp >= 0 ? tp : 0);
			setTotalElements(Number.isFinite(te) && te >= 0 ? te : 0);
			const srvPage = Number(response.number);
			if (Number.isFinite(srvPage) && srvPage >= 0 && srvPage !== page) {
				setPage(srvPage);
			}
		} catch (e: unknown) {
			if (seq === customersFetchGen.current) setError(resolveApiExceptionMessage(e, t));
		} finally {
			if (seq === customersFetchGen.current) setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [page, size, filterStatus, filterType, q]);

	// Stats: total = totalElements (global), les autres sont sur la page courante
	const stats = useMemo(() => {
		const by: Record<string, number> = {};
		for (const c of customers) {
			by[c.status] = (by[c.status] ?? 0) + 1;
		}
		return {
			total: totalElements,
			draft: by["DRAFT"] ?? 0,
			pending: by["PENDING_REVIEW"] ?? 0,
			verified: by["VERIFIED"] ?? 0,
			rejected: by["REJECTED"] ?? 0,
			blocked: by["BLOCKED"] ?? 0
		};
	}, [customers, totalElements]);

	// Les filtres sont gérés côté serveur ; tri worklist uniquement client (page courante).
	const sortedCustomers = useMemo(() => [...customers].sort((a, b) => compareCustomersWorklist(a, b, worklistSort)), [
		customers,
		worklistSort
	]);

	const footerTotalElements = useMemo(() => {
		const n = Number(totalElements);
		const base = Number.isFinite(n) && n >= 0 ? n : 0;
		return Math.max(base, sortedCustomers.length);
	}, [totalElements, sortedCustomers.length]);

	function applyWorklistPreset(
		mode: "all" | "action" | "blocked" | "draft"
	): void {
		setPage(0);
		if (mode === "all") setFilterStatus("ALL");
		else if (mode === "action") setFilterStatus("PENDING_REVIEW");
		else if (mode === "blocked") setFilterStatus("BLOCKED");
		else setFilterStatus("DRAFT");
	}

	return (
		<div className={OPS_PAGE_STACK}>
			<OpsPageHeader
				title={t("customer.worklist.title")}
				description={t("customer.worklist.subtitle")}
				actions={
					<>
						<Button onClick={load} variant="outline" className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("common.refresh")}
						</Button>
						<Link href="/customers/new">
							<Button variant="outline" className="flex items-center gap-2">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
								{t("customer.newPerson")}
							</Button>
						</Link>
						<Link href="/customers/new/business">
							<Button variant="outline" className="flex items-center gap-2">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
								</svg>
								{t("customer.newCompany")}
							</Button>
						</Link>
					</>
				}
			/>

			{/* Statistiques */}
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
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

			<OpsFilterPanel
				title={t("customer.filters.title")}
				icon={
					<svg className="w-5 h-5 text-ops-fg-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
				}
				gridClassName="grid grid-cols-1 md:grid-cols-3 gap-4"
			>
				<OpsField label={t("customer.filters.search")}>
					<div className="relative">
						<Input
							placeholder={t("customer.filters.searchPlaceholder")}
							value={q}
							onChange={(e) => {
								setQ(e.target.value);
								setPage(0);
							}}
							className="pl-10"
						/>
						<svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ops-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</OpsField>
				<OpsField label={t("customer.filters.status")}>
					<OpsSelect
						value={filterStatus}
						onChange={(e) => {
							setFilterStatus(e.target.value as typeof filterStatus);
							setPage(0);
						}}
					>
						<option value="ALL">{t("common.all")}</option>
						<option value="DRAFT">{t("customer.statuses.DRAFT")}</option>
						<option value="PENDING_REVIEW">{t("customer.statuses.PENDING_REVIEW")}</option>
						<option value="VERIFIED">{t("customer.statuses.VERIFIED")}</option>
						<option value="REJECTED">{t("customer.statuses.REJECTED")}</option>
						<option value="BLOCKED">{t("customer.statuses.BLOCKED")}</option>
					</OpsSelect>
				</OpsField>
				<OpsField label={t("customer.filters.type")}>
					<OpsSelect
						value={filterType}
						onChange={(e) => {
							setFilterType(e.target.value as typeof filterType);
							setPage(0);
						}}
					>
						<option value="ALL">{t("common.all")}</option>
						<option value="PERSON">{t("customer.types.PERSON")}</option>
						<option value="BUSINESS">{t("customer.types.BUSINESS")}</option>
					</OpsSelect>
				</OpsField>
			</OpsFilterPanel>

			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<div className="flex flex-wrap gap-2" aria-label={t("customer.worklist.presetsAria")}>
					<Button
						type="button"
						size="sm"
						variant={filterStatus === "ALL" ? "secondary" : "outline"}
						className={filterStatus === "ALL" ? "ring-2 ring-ops-ring" : undefined}
						onClick={() => applyWorklistPreset("all")}
					>
						{t("customer.worklist.presetAll")}
					</Button>
					<Button
						type="button"
						size="sm"
						variant={filterStatus === "PENDING_REVIEW" ? "secondary" : "outline"}
						className={filterStatus === "PENDING_REVIEW" ? "ring-2 ring-ops-ring" : undefined}
						onClick={() => applyWorklistPreset("action")}
					>
						{t("customer.worklist.presetAction")}
					</Button>
					<Button
						type="button"
						size="sm"
						variant={filterStatus === "BLOCKED" ? "secondary" : "outline"}
						className={filterStatus === "BLOCKED" ? "ring-2 ring-ops-ring" : undefined}
						onClick={() => applyWorklistPreset("blocked")}
					>
						{t("customer.worklist.presetBlocked")}
					</Button>
					<Button
						type="button"
						size="sm"
						variant={filterStatus === "DRAFT" ? "secondary" : "outline"}
						className={filterStatus === "DRAFT" ? "ring-2 ring-ops-ring" : undefined}
						onClick={() => applyWorklistPreset("draft")}
					>
						{t("customer.worklist.presetDraft")}
					</Button>
				</div>
				<OpsField label={t("customer.worklist.sortLabel")} className="min-w-[12rem] sm:max-w-xs">
					<OpsSelect
						value={worklistSort}
						onChange={(e) => setWorklistSort(e.target.value as CustomerWorklistSortMode)}
					>
						<option value="priority">{t("customer.worklist.sortPriority")}</option>
						<option value="risk_desc">{t("customer.worklist.sortRisk")}</option>
						<option value="recent">{t("customer.worklist.sortRecent")}</option>
					</OpsSelect>
				</OpsField>
			</div>

			{error && (
				<OpsInlineAlert variant="error">
					<svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{error}</span>
				</OpsInlineAlert>
			)}

			{loading ? (
				<OpsLoadingState message={t("common.loading")} />
			) : sortedCustomers.length === 0 ? (
				<OpsEmptyState
					title={t("customer.table.noCustomers")}
					hint={t("customer.table.noCustomersHint")}
					icon={
						<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					}
				/>
			) : (
				<OpsTableCard>
					<div className={OPS_TABLE_WRAP}>
						<table className={OPS_TABLE}>
							<thead className={OPS_THEAD}>
								<tr>
									<th className={`${OPS_TH} py-4`}>{t("common.id")}</th>
									<th className={`${OPS_TH} py-4 whitespace-nowrap`}>{t("customer.worklist.columnPriority")}</th>
									<th className={`${OPS_TH} py-4`}>{t("common.name")}</th>
									<th className={`${OPS_TH} py-4`}>{t("common.type")}</th>
									<th className={`${OPS_TH} py-4`}>{t("common.status")}</th>
									<th className={`${OPS_TH} py-4 w-52`}>{t("customer.table.phone")}</th>
									<th className={`${OPS_TH} py-4 whitespace-nowrap`}>{t("customer.worklist.columnAge")}</th>
									<th className={`${OPS_TH} py-4 text-right`}>{t("customer.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-ops-border bg-ops-surface">
								{sortedCustomers.map((c) => (
									<tr key={c.id} className={`${OPS_TR_HOVER} text-sm`}>
										<td className={OPS_TD}>
											<span className="font-mono font-medium">{c.id}</span>
										</td>
										<td className={OPS_TD}>
											<span
												title={t(`customer.statuses.${c.status}`)}
												className={`inline-flex rounded-md border px-2 py-0.5 text-xs tabular-nums ${worklistTierChipClass(c.status)}`}
											>
												{customerWorklistTierLabel(c.status)}
											</span>
										</td>
										<td className={OPS_TD}>
											<Link href={customerDetailPath(c.id, c.type)} className="font-medium text-ops-ring hover:underline">
												{c.displayName}
											</Link>
										</td>
										<td className={`${OPS_TD} text-ops-fg-muted`}>{t(`customer.types.${c.type}`)}</td>
										<td className={OPS_TD}>
											<DomainStatusBadge domain="kyc" category="client" code={c.status}>
												{t(`customer.statuses.${c.status}`)}
											</DomainStatusBadge>
										</td>
										<td className={`${OPS_TD} max-w-[13rem] overflow-hidden text-ops-fg-muted`} title={c.phone || undefined}>
											<span className="block truncate min-w-0">{c.phone || "-"}</span>
										</td>
										<td className={`${OPS_TD} whitespace-nowrap text-ops-fg-muted tabular-nums`}>
											{c.createdAt === undefined || customerDossierAgeDays(c) == null ? (
												t("customer.worklist.ageUnknown")
											) : (
												t("customer.worklist.ageDays", { count: customerDossierAgeDays(c)! })
											)}
										</td>
										<td className={`${OPS_TD} text-right`}>
											<Link href={customerDetailPath(c.id, c.type)}>
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
					{(sortedCustomers.length > 0 || totalElements > 0) && (
						<TablePagination
							page={page}
							totalPages={totalPages}
							totalElements={footerTotalElements}
							pageSize={size}
							onPageChange={(p) => setPage(p)}
							resultsLabel={
								footerTotalElements > 1
									? t("customer.table.pagination.customersPlural")
									: t("customer.table.pagination.customers")
							}
							showFirstLast
							sizeOptions={OPS_TABLE_PAGE_SIZE_OPTIONS}
							size={size}
							onSizeChange={(s) => {
								setSize(s);
								setPage(0);
							}}
						/>
					)}
				</OpsTableCard>
			)}
		</div>
	);
}
