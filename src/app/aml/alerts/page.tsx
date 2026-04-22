"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import type { AmlAlertResponse, AmlAlertStatus, AmlAlertSeverity } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import TablePagination from "@/components/ui/TablePagination";

const STATUSES: AmlAlertStatus[] = ["NEW", "ASSIGNED", "UNDER_REVIEW", "ESCALATED", "CLOSED"];
const SEVERITIES: AmlAlertSeverity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

function severityVariant(s: AmlAlertSeverity): "neutral" | "info" | "warning" | "danger" {
	if (s === "CRITICAL" || s === "HIGH") return "danger";
	if (s === "MEDIUM") return "warning";
	if (s === "LOW" || s === "INFO") return "info";
	return "neutral";
}

function AmlAlertsListInner() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const clientIdFromUrl = searchParams.get("clientId");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rows, setRows] = useState<AmlAlertResponse[]>([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [clientId, setClientId] = useState("");
	const [status, setStatus] = useState<AmlAlertStatus | "">("");
	const [severity, setSeverity] = useState<AmlAlertSeverity | "">("");

	const filtersRef = useRef({ clientId, status, severity });
	filtersRef.current = { clientId, status, severity };

	const stats = useMemo(() => {
		let newCount = 0;
		let inProgress = 0;
		let closed = 0;
		let highSeverity = 0;
		for (const a of rows) {
			if (a.status === "NEW") newCount++;
			if (a.status === "ASSIGNED" || a.status === "UNDER_REVIEW" || a.status === "ESCALATED") inProgress++;
			if (a.status === "CLOSED") closed++;
			if (a.severity === "HIGH" || a.severity === "CRITICAL") highSeverity++;
		}
		return { newCount, inProgress, closed, highSeverity };
	}, [rows]);

	const fetchAlerts = useCallback(async (pageOverride?: number, sizeOverride?: number, clientIdOverride?: string | null) => {
		const p = pageOverride ?? page;
		const s = sizeOverride ?? size;
		const f = filtersRef.current;
		const cidRaw = clientIdOverride !== undefined && clientIdOverride !== null ? clientIdOverride : f.clientId;
		setLoading(true);
		setError(null);
		try {
			const data = await amlApi.listAlerts({
				clientId: cidRaw.trim() ? Number(cidRaw) : undefined,
				status: f.status || undefined,
				severity: f.severity || undefined,
				page: p,
				size: s
			});
			setRows(data.content ?? []);
			setTotalPages(data.totalPages ?? 0);
			setTotalElements(data.totalElements ?? 0);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [page, size]);

	useEffect(() => {
		void fetchAlerts();
	}, [page, size, fetchAlerts]);

	useEffect(() => {
		const q = clientIdFromUrl?.trim() ?? "";
		if (!q || !/^\d+$/.test(q)) return;
		setClientId(q);
		setPage(0);
		void fetchAlerts(0, size, q);
	}, [clientIdFromUrl, size, fetchAlerts]);

	function onSearch() {
		setPage(0);
		void fetchAlerts(0, size);
	}

	function onRefresh() {
		void fetchAlerts(page, size);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("aml.alerts.title")}</h1>
					<p className="text-gray-600 mt-1">{t("aml.alerts.subtitle")}</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button type="button" variant="outline" className="flex items-center gap-2" onClick={onRefresh} disabled={loading}>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Link href={clientId.trim() ? `/aml/alerts/new?clientId=${encodeURIComponent(clientId.trim())}` : "/aml/alerts/new"}>
						<Button type="button" className="flex items-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							{t("aml.alerts.manualNew")}
						</Button>
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("aml.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{totalElements}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">{t("aml.stats.new")}</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.newCount}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-sky-50 to-sky-100 p-5 rounded-xl shadow-sm border border-sky-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-sky-700 mb-1">{t("aml.stats.inProgress")}</div>
							<div className="text-3xl font-bold text-sky-900">{stats.inProgress}</div>
						</div>
						<div className="w-12 h-12 bg-sky-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-gray-700 mb-1">{t("aml.stats.closed")}</div>
							<div className="text-3xl font-bold text-gray-900">{stats.closed}</div>
						</div>
						<div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200 col-span-2 md:col-span-1">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">{t("aml.stats.highSeverity")}</div>
							<div className="text-3xl font-bold text-red-900">{stats.highSeverity}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
					</div>
				</div>
			</div>
			<p className="text-xs text-gray-500 -mt-2">{t("aml.stats.pageHint")}</p>

			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("aml.filters.title")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.clientId")}</label>
						<Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="ID" className="h-10" />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.status")}</label>
						<select className={SELECT_CLASS} value={status} onChange={(e) => setStatus(e.target.value as AmlAlertStatus | "")}>
							<option value="">{t("aml.filters.all")}</option>
							{STATUSES.map((st) => (
								<option key={st} value={st}>
									{st}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.severity")}</label>
						<select className={SELECT_CLASS} value={severity} onChange={(e) => setSeverity(e.target.value as AmlAlertSeverity | "")}>
							<option value="">{t("aml.filters.all")}</option>
							{SEVERITIES.map((sv) => (
								<option key={sv} value={sv}>
									{sv}
								</option>
							))}
						</select>
					</div>
					<div>
						<Button type="button" className="w-full sm:w-auto h-10" onClick={onSearch} disabled={loading}>
							{t("aml.actions.search")}
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{loading && rows.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			) : rows.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("aml.empty")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.ref")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.title")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.severity")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.status")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.client")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.created")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{rows.map((a) => (
									<tr key={a.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900">{a.publicRef}</td>
										<td className="px-6 py-4 max-w-xs truncate text-gray-900" title={a.title}>
											{a.title}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">{a.status}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link href={`/customers/${a.clientId}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
												{a.clientId}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/aml/alerts/${a.id}`}>
												<Button variant="outline" size="sm" className="inline-flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("aml.actions.open")}
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<TablePagination
						page={page}
						pageSize={size}
						totalPages={totalPages}
						totalElements={totalElements}
						onPageChange={setPage}
						sizeOptions={[10, 20, 50]}
						size={size}
						onSizeChange={(s) => {
							setSize(s);
							setPage(0);
						}}
						resultsLabel={t("aml.alerts.resultsLabel")}
						showFirstLast
					/>
				</div>
			)}
		</div>
	);
}

export default function AmlAlertsPage() {
	const { t } = useTranslation();
	return (
		<Suspense
			fallback={
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			}
		>
			<AmlAlertsListInner />
		</Suspense>
	);
}
