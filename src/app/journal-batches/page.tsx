"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { journalBatchesApi } from "@/lib/api";
import type { JournalBatch, JournalBatchStatus } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";
import { formatAmount as formatAmountUtil } from "@/lib/utils";

const STATUS_COLORS: Record<JournalBatchStatus, string> = {
	DRAFT: "bg-yellow-100 text-yellow-800",
	POSTED: "bg-blue-100 text-blue-800",
	CLOSED: "bg-green-100 text-green-800"
};

export default function JournalBatchesPage() {
	const { t, i18n } = useTranslation();
	const { isAuthenticated, loading: authLoading } = useAuth();

	const STATUS_LABELS: Record<JournalBatchStatus, string> = {
		DRAFT: t("journalBatches.statusDraft"),
		POSTED: t("journalBatches.statusPosted"),
		CLOSED: t("journalBatches.statusClosed")
	};
	const [batches, setBatches] = useState<JournalBatch[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filterStatus, setFilterStatus] = useState<JournalBatchStatus | "">("");
	const [filterStartDate, setFilterStartDate] = useState("");
	const [filterEndDate, setFilterEndDate] = useState("");
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);

	useEffect(() => {
		// Ne charger les données que si l'utilisateur est authentifié et que le chargement est terminé
		if (authLoading) return;
		if (!isAuthenticated) return;
		
		loadBatches();
	}, [filterStatus, filterStartDate, filterEndDate, page, size, authLoading, isAuthenticated]);

	async function loadBatches() {
		setLoading(true);
		setError(null);
		try {
			const response = await journalBatchesApi.list({
				status: filterStatus || undefined,
				startDate: filterStartDate || undefined,
				endDate: filterEndDate || undefined,
				page,
				size
			});
			setBatches(response.content);
			setTotalPages(response.totalPages);
			setTotalElements(response.totalElements);
		} catch (e: any) {
			setError(e?.message ?? t("journalBatches.errorLoad"));
		} finally {
			setLoading(false);
		}
	}

	function formatAmount(amount: number, currency: string): string {
		const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
		return formatAmountUtil(amount, currency, locale);
	}

	/** Pour les chaînes date seule "YYYY-MM-DD" : évite le décalage d'un jour en fuseaux à l'ouest de UTC */
	function formatDateOnly(dateString: string): string {
		const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
		const [y, m, d] = dateString.split("-").map(Number);
		const date = new Date(y, m - 1, d);
		return date.toLocaleDateString(locale, {
			day: "2-digit",
			month: "2-digit",
			year: "numeric"
		});
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("journalBatches.title")}</h1>
					<p className="text-gray-600 mt-1">{t("journalBatches.subtitle")}</p>
				</div>
				<Button onClick={loadBatches} variant="outline" className="flex items-center gap-2">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					{t("journalBatches.refresh")}
				</Button>
			</div>

			{/* Filtres */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("journalBatches.filters")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("journalBatches.status")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value as JournalBatchStatus || "")}
						>
							<option value="">{t("journalBatches.allStatuses")}</option>
							<option value="DRAFT">{t("journalBatches.statusDraft")}</option>
							<option value="POSTED">{t("journalBatches.statusPosted")}</option>
							<option value="CLOSED">{t("journalBatches.statusClosed")}</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("journalBatches.startDate")}</label>
						<Input
							type="date"
							value={filterStartDate}
							onChange={(e) => setFilterStartDate(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("journalBatches.endDate")}</label>
						<Input
							type="date"
							value={filterEndDate}
							onChange={(e) => setFilterEndDate(e.target.value)}
						/>
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
					<p className="mt-4 text-gray-600">{t("journalBatches.loadingBatches")}</p>
				</div>
			) : batches.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("journalBatches.noBatches")}</p>
					<p className="text-gray-400 text-sm mt-2">{t("journalBatches.noBatchesHint")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.number")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.date")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.description")}</th>
									<th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.debit")}</th>
									<th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.credit")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.status")}</th>
									<th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{batches.map((batch) => (
									<tr key={batch.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/journal-batches/${batch.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
											>
												{batch.batchNumber}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{formatDateOnly(batch.batchDate)}
										</td>
										<td className="px-6 py-4 text-gray-600">
											{batch.description || "—"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-900">
											{formatAmount(batch.totalDebit, batch.currency ?? "XAF")}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-900">
											{formatAmount(batch.totalCredit, batch.currency ?? "XAF")}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className={STATUS_COLORS[batch.status]}>
												{STATUS_LABELS[batch.status]}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/journal-batches/${batch.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("journalBatches.view")}
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(batches.length > 0 || totalElements > 0) && (
						<TablePagination
							page={page}
							totalPages={totalPages}
							totalElements={totalElements}
							pageSize={size}
							onPageChange={setPage}
							resultsLabel={totalElements > 1 ? t("journalBatches.paginationResultsLabel") : t("journalBatches.paginationResultLabel")}
							showFirstLast
							sizeOptions={OPS_TABLE_PAGE_SIZE_OPTIONS}
							size={size}
							onSizeChange={(nextSize) => {
								setSize(nextSize);
								setPage(0);
							}}
						/>
					)}
				</div>
			)}
		</div>
	);
}
