"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Toast from "@/components/ui/Toast";
import { holdsApi, accountsApi } from "@/lib/api";
import { formatAmount as formatAmountUtil } from "@/lib/utils";
import type { Hold, Account } from "@/types";

const HOLD_STATUS_CLASS: Record<string, string> = {
	PENDING: "bg-yellow-100 text-yellow-800",
	APPLIED: "bg-green-100 text-green-800",
	RELEASED: "bg-gray-100 text-gray-800",
	EXPIRED: "bg-red-100 text-red-800"
};

interface HoldListByAccountProps {
	title: string;
	description: string;
	newPagePath?: string;
}

export default function HoldListByAccount({ title, description, newPagePath }: HoldListByAccountProps) {
	const { t } = useTranslation();
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [holds, setHolds] = useState<Hold[]>([]);
	const [holdsLoading, setHoldsLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";

	function formatCurrency(amount: number, currency: string) {
		return formatAmountUtil(amount, currency || "XAF", locale);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString(locale, {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	useEffect(() => {
		async function load() {
			try {
				const res = await accountsApi.list({ size: 500 });
				setAccounts(res.content || []);
			} catch (e: any) {
				setError(t("hold.list.errors.loadAccounts"));
			}
		}
		load();
	}, []);

	async function loadAllHolds() {
		setHoldsLoading(true);
		setError(null);
		try {
			const data = await holdsApi.list();
			setHolds(data);
		} catch (e: any) {
			setToast({ message: e?.message ?? t("hold.list.errors.loadHolds"), type: "error" });
			setHolds([]);
		} finally {
			setHoldsLoading(false);
		}
	}

	useEffect(() => {
		loadAllHolds();
	}, []);

	async function handleReleaseHold(holdId: number) {
		setActionLoading(true);
		try {
			await holdsApi.release(holdId);
			setToast({ message: t("hold.list.releaseSuccess"), type: "success" });
			await loadAllHolds();
		} catch (e: any) {
			setToast({ message: e?.message ?? t("hold.list.errors.releaseFailed"), type: "error" });
		} finally {
			setActionLoading(false);
		}
	}

	const stats = useMemo(() => {
		const total = holds.length;
		const pending = holds.filter((h) => h.status === "PENDING").length;
		const applied = holds.filter((h) => h.status === "APPLIED").length;
		const released = holds.filter((h) => h.status === "RELEASED").length;
		const expired = holds.filter((h) => h.status === "EXPIRED").length;
		const totalPendingAmount = holds
			.filter((h) => h.status === "PENDING")
			.reduce((sum, h) => sum + h.amount, 0);
		return { total, pending, applied, released, expired, totalPendingAmount };
	}, [holds]);

	return (
		<div className="space-y-6">
			{/* En-tête : même style que TransactionListByType */}
			<div className="flex items-center justify-between">
				<div>
					<Link
						href="/transactions"
						className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("transaction.byType.backToTransactions")}
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">{title}</h1>
					<p className="text-gray-600 mt-1">{description}</p>
				</div>
				{newPagePath && (
					<Link href={newPagePath}>
						<Button className="flex items-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							{t("transaction.byType.new")}
						</Button>
					</Link>
				)}
			</div>

			{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{/* Barre des stats : même position que /transactions/deposit */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("hold.list.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">{t("hold.list.stats.pending")}</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">{t("hold.list.stats.applied")}</div>
							<div className="text-3xl font-bold text-green-900">{stats.applied}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-gray-700 mb-1">{t("hold.list.stats.released")}</div>
							<div className="text-3xl font-bold text-gray-900">{stats.released}</div>
						</div>
						<div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 4v6m2 10v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6h4z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">{t("hold.list.stats.expired")}</div>
							<div className="text-3xl font-bold text-red-900">{stats.expired}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			{stats.totalPendingAmount > 0 && (
				<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-xl shadow-sm border border-indigo-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-indigo-700 mb-1">{t("hold.list.stats.totalPendingAmount")}</div>
							<div className="text-2xl font-bold text-indigo-900">
								{formatCurrency(stats.totalPendingAmount, holds[0]?.currency ?? "XAF")}
							</div>
						</div>
						<div className="w-12 h-12 bg-indigo-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
			)}

			{/* Tableau : même style que /transactions/deposit */}
			{holdsLoading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("transaction.byType.loading")}</p>
				</div>
			) : holds.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("hold.list.noHolds")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("transaction.byType.table.number")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("transaction.byType.table.account")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("hold.list.amount")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("hold.list.status")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("transaction.byType.table.date")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("hold.list.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{holds.map((hold) => (
									<tr key={hold.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Link href={`/holds/${hold.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium">
												#{hold.id}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/accounts/${hold.accountId}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
											>
												{accounts.find((a) => a.id === hold.accountId)?.accountNumber ?? hold.accountId}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="font-mono font-semibold text-gray-900">
												{formatCurrency(hold.amount, hold.currency)}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className={HOLD_STATUS_CLASS[hold.status] ?? "bg-gray-100 text-gray-800"}>
												{t(`hold.status.${hold.status}`)}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{hold.createdAt ? formatDate(hold.createdAt) : "—"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											{hold.status === "PENDING" && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="flex items-center gap-1 inline-flex mr-2 border-red-200 text-red-700 hover:bg-red-50"
													onClick={() => handleReleaseHold(hold.id)}
													disabled={actionLoading}
												>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 4v6m2 10v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6h4z" />
													</svg>
													{t("hold.list.release")}
												</Button>
											)}
											{hold.status === "APPLIED" && hold.transactionId && (
												<Link href={`/transactions/${hold.transactionId}`} className="mr-2">
													<Button variant="outline" size="sm" className="flex items-center gap-1 inline-flex">
														{t("hold.list.viewTransaction")}
													</Button>
												</Link>
											)}
											<Link href={`/holds/${hold.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1 inline-flex">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("transaction.byType.table.view")}
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
