"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { journalBatchesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { JournalBatch, JournalBatchStatus, LedgerEntry } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatAmount as formatAmountUtil } from "@/lib/utils";

const STATUS_COLORS: Record<JournalBatchStatus, string> = {
	DRAFT: "bg-yellow-100 text-yellow-800",
	POSTED: "bg-green-100 text-green-800",
	CLOSED: "bg-green-100 text-green-800"
};

export default function JournalBatchDetailPage() {
	const { t, i18n } = useTranslation();
	const params = useParams();
	const batchId = params.id as string;
	const { isAuthenticated, loading: authLoading } = useAuth();

	const STATUS_LABELS: Record<JournalBatchStatus, string> = {
		DRAFT: t("journalBatches.statusDraft"),
		POSTED: t("journalBatches.statusPostedLegacy"),
		CLOSED: t("journalBatches.statusClosed")
	};

	const [batch, setBatch] = useState<JournalBatch | null>(null);
	const [entries, setEntries] = useState<LedgerEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [entriesLoading, setEntriesLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (authLoading) return;
		if (!isAuthenticated) return;
		if (batchId) {
			loadBatch();
			loadEntries();
		}
	}, [batchId, authLoading, isAuthenticated]);

	async function loadBatch() {
		setLoading(true);
		setError(null);
		try {
			const data = await journalBatchesApi.get(batchId);
			setBatch(data);
		} catch (e: any) {
			setError(e?.message ?? t("journalBatches.detail.errorLoad"));
		} finally {
			setLoading(false);
		}
	}

	async function loadEntries() {
		if (!batchId) return;
		setEntriesLoading(true);
		try {
			const data = await journalBatchesApi.getEntries(batchId);
			setEntries(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des écritures:", e);
		} finally {
			setEntriesLoading(false);
		}
	}

	function formatAmount(amount: number, currency: string): string {
		const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
		return formatAmountUtil(amount, currency, locale);
	}

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

	function formatDateTime(dateString: string): string {
		const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
		return new Date(dateString).toLocaleString(locale, {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	const currency = entries.length > 0 ? entries[0].currency : "XAF";
	const isBalanced = batch ? Math.abs(batch.totalDebit - batch.totalCredit) < 0.01 : false;
	const difference = batch ? Math.abs(batch.totalDebit - batch.totalCredit) : 0;

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">{t("journalBatches.detail.loadingBatch")}</p>
				</div>
			</div>
		);
	}

	if (error && !batch) {
		return (
			<div className="space-y-6">
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
				<Link href="/journal-batches">
					<Button variant="outline">{t("journalBatches.detail.backToList")}</Button>
				</Link>
			</div>
		);
	}

	if (!batch) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<Link href="/journal-batches">
							<Button variant="outline" size="sm" className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
								</svg>
								{t("journalBatches.detail.back")}
							</Button>
						</Link>
						<h1 className="text-3xl font-bold text-gray-900">{batch.batchNumber}</h1>
						<Badge className={STATUS_COLORS[batch.status]}>
							{STATUS_LABELS[batch.status]}
						</Badge>
					</div>
					<p className="text-gray-600">{t("journalBatches.detail.subtitle")}</p>
				</div>
			</div>

			<div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
				{t("journalBatches.detail.readOnlyHint")}
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">{t("journalBatches.detail.batchInfo")}</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.detail.batchNumber")}</label>
						<p className="text-lg font-mono font-semibold text-gray-900">{batch.batchNumber}</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.detail.batchDate")}</label>
						<p className="text-lg text-gray-900">{formatDateOnly(batch.batchDate)}</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.status")}</label>
						<Badge className={STATUS_COLORS[batch.status]}>
							{STATUS_LABELS[batch.status]}
						</Badge>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.detail.totalDebit")}</label>
						<p className="text-lg font-mono font-semibold text-gray-900">
							{formatAmount(batch.totalDebit, batch.currency)}
						</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.detail.totalCredit")}</label>
						<p className="text-lg font-mono font-semibold text-gray-900">
							{formatAmount(batch.totalCredit, batch.currency)}
						</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.detail.currency")}</label>
						<p className="text-lg text-gray-900">
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
								{entries.length > 0 ? entries[0].currency : "XAF"}
							</span>
						</p>
					</div>
					{batch.description && (
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.description")}</label>
							<p className="text-gray-900">{batch.description}</p>
						</div>
					)}
					<div>
						<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.detail.createdAt")}</label>
						<p className="text-gray-900">{formatDateTime(batch.createdAt)}</p>
					</div>
					{(batch.status === "CLOSED" || batch.status === "POSTED") && (
						<div>
							<label className="block text-sm font-medium text-gray-500 mb-1">{t("journalBatches.detail.closedAt")}</label>
							<p className="text-gray-900">{formatDateTime(batch.updatedAt)}</p>
						</div>
					)}
				</div>

				<div className={`mt-6 p-4 rounded-lg border ${
					isBalanced
						? "bg-green-50 border-green-200"
						: "bg-red-50 border-red-200"
				}`}>
					<div className="flex items-center gap-3">
						{isBalanced ? (
							<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						) : (
							<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						)}
						<div>
							<p className={`font-semibold ${
								isBalanced ? "text-green-800" : "text-red-800"
							}`}>
								{isBalanced
									? t("journalBatches.detail.balanced")
									: t("journalBatches.detail.unbalanced", { amount: formatAmount(difference, currency) })
								}
							</p>
							<p className={`text-sm mt-1 ${
								isBalanced ? "text-green-700" : "text-red-700"
							}`}>
								{isBalanced
									? t("journalBatches.detail.balancedHint")
									: t("journalBatches.detail.unbalancedHint")
								}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="p-6 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-gray-900">
							{t("journalBatches.detail.entriesCount", { count: entries.length })}
						</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={loadEntries}
							disabled={entriesLoading}
							className="flex items-center gap-2"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("journalBatches.detail.refresh")}
						</Button>
					</div>
				</div>

				{entriesLoading ? (
					<div className="p-12 text-center">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						<p className="mt-4 text-gray-600">{t("journalBatches.detail.loadingEntries")}</p>
					</div>
				) : entries.length === 0 ? (
					<div className="p-12 text-center">
						<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<p className="text-gray-500 text-lg font-medium">{t("journalBatches.detail.noEntries")}</p>
						<p className="text-gray-400 text-sm mt-2">{t("journalBatches.detail.noEntriesHint")}</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.date")}</th>
									<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.detail.glAccount")}</th>
									<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.description")}</th>
									<th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.debit")}</th>
									<th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.credit")}</th>
									<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.detail.currency")}</th>
									<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("journalBatches.detail.reference")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{entries.map((entry) => (
									<tr key={entry.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{formatDateOnly(entry.entryDate)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/ledger-accounts/${entry.ledgerAccountId}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
											>
												{entry.ledgerAccount?.code ?? entry.ledgerAccountCode ?? `GL-${entry.ledgerAccountId}`}
											</Link>
										</td>
										<td className="px-6 py-4 text-gray-600">
											{entry.description || "—"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-900">
											{entry.debitAmount > 0 ? formatAmount(entry.debitAmount, entry.currency) : "—"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-900">
											{entry.creditAmount > 0 ? formatAmount(entry.creditAmount, entry.currency) : "—"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
												{entry.currency}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{entry.referenceType && entry.referenceId ? (
												<span className="text-xs">
													{entry.referenceType} #{entry.referenceId}
												</span>
											) : (
												"—"
											)}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot className="bg-gray-50">
								<tr>
									<td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-700">
										{t("journalBatches.detail.totals")}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-gray-900">
										{formatAmount(
											entries.reduce((sum, e) => sum + e.debitAmount, 0),
											currency
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-gray-900">
										{formatAmount(
											entries.reduce((sum, e) => sum + e.creditAmount, 0),
											currency
										)}
									</td>
									<td colSpan={2}></td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
