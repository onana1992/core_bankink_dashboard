"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FolderKanban, Plus } from "lucide-react";
import { amlApi } from "@/lib/api";
import type { AmlCaseStatus, AmlCaseSummaryResponse } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";

const CASE_STATUSES: AmlCaseStatus[] = ["OPEN", "IN_REVIEW", "ESCALATED", "CLOSED"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

function caseStatusBadgeVariant(s: AmlCaseStatus): "neutral" | "success" | "warning" | "danger" | "info" {
	switch (s) {
		case "CLOSED":
			return "success";
		case "OPEN":
			return "info";
		case "IN_REVIEW":
			return "warning";
		case "ESCALATED":
			return "danger";
		default:
			return "neutral";
	}
}

function AmlCasesListInner() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const clientIdFromUrl = searchParams.get("clientId");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rows, setRows] = useState<AmlCaseSummaryResponse[]>([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);

	const [clientId, setClientId] = useState("");
	const [status, setStatus] = useState<AmlCaseStatus | "">("");
	const [publicRef, setPublicRef] = useState("");

	const filtersRef = useRef({ clientId, status, publicRef });
	filtersRef.current = { clientId, status, publicRef };

	const stats = useMemo(() => {
		let open = 0;
		let inReview = 0;
		let closed = 0;
		for (const c of rows) {
			if (c.status === "OPEN") open++;
			if (c.status === "IN_REVIEW" || c.status === "ESCALATED") inReview++;
			if (c.status === "CLOSED") closed++;
		}
		return { open, inReview, closed };
	}, [rows]);

	const fetchCases = useCallback(
		async (pageOverride?: number, sizeOverride?: number, clientIdOverride?: string | null) => {
			const p = pageOverride ?? page;
			const s = sizeOverride ?? size;
			const f = filtersRef.current;
			const cidRaw = clientIdOverride !== undefined && clientIdOverride !== null ? clientIdOverride : f.clientId;
			setLoading(true);
			setError(null);
			try {
				const data = await amlApi.listCases({
					clientId: cidRaw.trim() ? Number(cidRaw) : undefined,
					status: f.status || undefined,
					publicRef: f.publicRef.trim() || undefined,
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
		},
		[page, size]
	);

	useEffect(() => {
		void fetchCases();
	}, [page, size, fetchCases]);

	useEffect(() => {
		const q = clientIdFromUrl?.trim() ?? "";
		if (!q || !/^\d+$/.test(q)) return;
		setClientId(q);
		setPage(0);
		void fetchCases(0, size, q);
	}, [clientIdFromUrl, size, fetchCases]);

	function onSearch() {
		setPage(0);
		void fetchCases(0, size);
	}

	function onRefresh() {
		void fetchCases(page, size);
	}

	const newCaseHref = clientId.trim() ? `/aml/cases/new?clientId=${encodeURIComponent(clientId.trim())}` : "/aml/cases/new";

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("aml.cases.indexTitle")}</h1>
					<p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">{t("aml.cases.indexSubtitle")}</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button type="button" variant="outline" className="flex items-center gap-2" onClick={onRefresh} disabled={loading}>
						<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Link href={newCaseHref}>
						<Button type="button" className="inline-flex items-center gap-2">
							<Plus className="h-5 w-5 shrink-0" aria-hidden />
							{t("aml.cases.createNew")}
						</Button>
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-sm">
					<div className="flex items-center justify-between gap-2">
						<div className="min-w-0">
							<div className="mb-1 text-sm font-medium text-blue-700">{t("aml.cases.statsTotal")}</div>
							<div className="text-3xl font-bold text-blue-900">{totalElements}</div>
						</div>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-200">
							<FolderKanban className="h-6 w-6 text-blue-700" aria-hidden />
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 p-5 shadow-sm">
					<div className="flex items-center justify-between gap-2">
						<div className="min-w-0">
							<div className="mb-1 text-sm font-medium text-sky-700">{t("aml.cases.statsOpen")}</div>
							<div className="text-3xl font-bold text-sky-900">{stats.open}</div>
						</div>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-200">
							<svg className="h-6 w-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-5 shadow-sm">
					<div className="flex items-center justify-between gap-2">
						<div className="min-w-0">
							<div className="mb-1 text-sm font-medium text-amber-800">{t("aml.cases.statsInReview")}</div>
							<div className="text-3xl font-bold text-amber-900">{stats.inReview}</div>
						</div>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-200">
							<svg className="h-6 w-6 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="col-span-2 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-5 shadow-sm lg:col-span-1">
					<div className="flex items-center justify-between gap-2">
						<div className="min-w-0">
							<div className="mb-1 text-sm font-medium text-gray-700">{t("aml.cases.statsClosed")}</div>
							<div className="text-3xl font-bold text-gray-900">{stats.closed}</div>
						</div>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-200">
							<svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("aml.filters.title")}</h2>
				</div>
				<div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-12">
					<div className="lg:col-span-3">
						<label className="mb-2 block text-sm font-medium text-gray-700">{t("aml.filters.clientId")}</label>
						<Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="ID" className="h-10" />
					</div>
					<div className="lg:col-span-3">
						<label className="mb-2 block text-sm font-medium text-gray-700">{t("aml.filters.status")}</label>
						<select className={SELECT_CLASS} value={status} onChange={(e) => setStatus(e.target.value as AmlCaseStatus | "")}>
							<option value="">{t("aml.filters.all")}</option>
							{CASE_STATUSES.map((st) => (
								<option key={st} value={st}>
									{st}
								</option>
							))}
						</select>
					</div>
					<div className="lg:col-span-4">
						<label className="mb-2 block text-sm font-medium text-gray-700">{t("aml.cases.filterPublicRef")}</label>
						<Input
							value={publicRef}
							onChange={(e) => setPublicRef(e.target.value)}
							placeholder={t("aml.cases.filterPublicRefPlaceholder")}
							className="h-10 font-mono text-sm"
							autoComplete="off"
						/>
					</div>
					<div className="lg:col-span-2">
						<Button type="button" className="h-10 w-full sm:w-auto" onClick={onSearch} disabled={loading}>
							{t("aml.actions.search")}
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded border-l-4 border-red-400 bg-red-50 px-4 py-3 text-red-800">
					<svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{loading && rows.length === 0 ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			) : rows.length === 0 ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<p className="text-lg font-medium text-gray-500">{t("aml.empty")}</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">{t("aml.table.ref")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">{t("aml.filters.status")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">{t("aml.table.client")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">{t("aml.cases.columnOwner")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">{t("aml.cases.columnOpened")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">{t("aml.cases.columnClosed")}</th>
									<th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-700">{t("aml.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white text-sm">
								{rows.map((c) => (
									<tr key={c.id} className="transition-colors hover:bg-gray-50">
										<td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-900">{c.publicRef}</td>
										<td className="whitespace-nowrap px-6 py-4">
											<Badge variant={caseStatusBadgeVariant(c.status)}>{c.status}</Badge>
										</td>
										<td className="whitespace-nowrap px-6 py-4">
											<Link href={`/customers/${c.clientId}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
												{c.clientId}
											</Link>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-gray-700">{c.ownerUsername?.trim() || "—"}</td>
										<td className="whitespace-nowrap px-6 py-4 text-gray-600">{c.openedAt ? new Date(c.openedAt).toLocaleString() : "—"}</td>
										<td className="whitespace-nowrap px-6 py-4 text-gray-600">{c.closedAt ? new Date(c.closedAt).toLocaleString() : "—"}</td>
										<td className="whitespace-nowrap px-6 py-4 text-right">
											<Link href={`/aml/cases/${c.id}`}>
												<Button variant="outline" size="sm" className="inline-flex items-center gap-1">
													<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
						sizeOptions={OPS_TABLE_PAGE_SIZE_OPTIONS}
						size={size}
						onSizeChange={(s) => {
							setSize(s);
							setPage(0);
						}}
						resultsLabel={t("aml.cases.resultsLabel")}
						showFirstLast
						className="!border-t-gray-200 !bg-gray-50/90 [&_.text-ops-fg]:text-gray-800 [&_.text-ops-fg-muted]:text-gray-600 [&_select]:border-gray-300 [&_select]:bg-white"
					/>
				</div>
			)}
		</div>
	);
}

export default function AmlCasesPage() {
	const { t } = useTranslation();
	return (
		<Suspense
			fallback={
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			}
		>
			<AmlCasesListInner />
		</Suspense>
	);
}
