"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { loansApi, accountsApi } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import type { Account, AccountStatus, LoanScheduleItem } from "@/types";

export default function LoanDetailPage() {
	const params = useParams();
	const { t, i18n } = useTranslation();
	const { showToast } = useToast();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const accountId = params.id as string;
	const [loan, setLoan] = useState<Account | null>(null);
	const [schedule, setSchedule] = useState<LoanScheduleItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [generatingSchedule, setGeneratingSchedule] = useState(false);
	const [showDisburseModal, setShowDisburseModal] = useState(false);
	const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
	const [selectedTargetId, setSelectedTargetId] = useState<number | "">("");
	const [disburseLoading, setDisburseLoading] = useState(false);
	const [loadingAccounts, setLoadingAccounts] = useState(false);

	async function load() {
		if (!accountId) return;
		setLoading(true);
		setError(null);
		try {
			const [loanData, scheduleData] = await Promise.all([
				loansApi.get(accountId),
				loansApi.getSchedule(accountId).catch(() => [])
			]);
			setLoan(loanData);
			setSchedule(scheduleData);
		} catch (e: any) {
			setError(e?.message ?? t("loan.detail.loadError"));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [accountId]);

	async function handleGenerateSchedule() {
		if (!accountId) return;
		setGeneratingSchedule(true);
		try {
			const newSchedule = await loansApi.generateSchedule(accountId);
			setSchedule(newSchedule);
		} catch (e: any) {
			setError(e?.message ?? "Erreur génération échéancier");
		} finally {
			setGeneratingSchedule(false);
		}
	}

	const canDisburse = loan?.status === "ACTIVE" && loan?.disbursedAt == null;
	const clientId = loan?.clientId ?? loan?.client?.id;

	async function openDisburseModal() {
		if (!clientId) return;
		setShowDisburseModal(true);
		setSelectedTargetId("");
		setLoadingAccounts(true);
		setError(null);
		try {
			const accounts = await accountsApi.getClientAccounts(clientId);
			// Exclure le compte prêt et ne garder que les comptes ACTIVE
			const eligible = accounts.filter(
				(a) => a.id !== loan?.id && a.status === "ACTIVE"
			);
			setClientAccounts(eligible);
		} catch (e: any) {
			showToast(e?.message ?? t("loan.detail.disburseError"), "error");
		} finally {
			setLoadingAccounts(false);
		}
	}

	async function handleDisburse() {
		if (!accountId || selectedTargetId === "") return;
		setDisburseLoading(true);
		setError(null);
		try {
			await loansApi.disburse(accountId, { targetAccountId: selectedTargetId as number });
			showToast(t("loan.detail.disburseSuccess"), "success");
			setShowDisburseModal(false);
			load();
		} catch (e: any) {
			showToast(e?.message ?? t("loan.detail.disburseError"), "error");
		} finally {
			setDisburseLoading(false);
		}
	}

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString(locale);
	}

	function getStatusBadge(status: AccountStatus) {
		const colors: Record<AccountStatus, string> = {
			ACTIVE: "bg-green-100 text-green-800",
			CLOSED: "bg-gray-100 text-gray-800",
			FROZEN: "bg-red-100 text-red-800",
			SUSPENDED: "bg-yellow-100 text-yellow-800"
		};
		const labels: Record<AccountStatus, string> = {
			ACTIVE: t("loan.detail.statusActive"),
			CLOSED: t("loan.detail.statusClosed"),
			FROZEN: t("loan.detail.statusFrozen"),
			SUSPENDED: t("loan.detail.statusSuspended")
		};
		return <Badge className={colors[status]}>{labels[status]}</Badge>;
	}

	const scheduleTotals = useMemo(() => {
		let totalPrincipal = 0;
		let totalInterest = 0;
		let totalAmount = 0;
		schedule.forEach((row) => {
			totalPrincipal += Number(row.principalAmount ?? 0);
			totalInterest += Number(row.interestAmount ?? 0);
			totalAmount += Number(row.totalAmount ?? 0);
		});
		return { totalPrincipal, totalInterest, totalAmount };
	}, [schedule]);

	if (loading && !loan) {
		return (
			<div className="space-y-6">
				<div>
					<Link href="/loans" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("loan.backToList")}
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">{t("loan.detail.title")}</h1>
					<p className="text-gray-600 mt-1">{t("loan.detail.loading")}</p>
				</div>
				<div className="text-gray-500">{t("loan.detail.loading")}</div>
			</div>
		);
	}
	if (error && !loan) {
		return (
			<div className="space-y-6">
				<div>
					<Link href="/loans" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("loan.backToList")}
					</Link>
				</div>
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			</div>
		);
	}
	if (!loan) return null;

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/loans" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("loan.backToList")}
				</Link>
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{t("loan.detail.loanTitle", { number: loan.accountNumber })}</h1>
						<p className="text-gray-600 mt-1">{loan.product?.name ?? "—"}</p>
					</div>
					<div className="flex items-center gap-2">
						{canDisburse && (
							<Button size="sm" onClick={openDisburseModal}>
								{t("loan.detail.disburse")}
							</Button>
						)}
						<Link href={`/accounts/${loan.id}`}>
							<Button variant="outline" size="sm">{t("loan.detail.viewAsAccount")}</Button>
						</Link>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{/* Fiche prêt */}
			<div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
						<div>
							<h2 className="text-lg font-semibold text-white">{t("loan.detail.cardTitle")}</h2>
							<p className="text-sm text-indigo-100">{loan.product?.name ?? "—"}</p>
						</div>
					</div>
				</div>
				<div className="p-5 space-y-5">
					<div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
						<dt className="text-sm font-medium text-amber-800 mb-1">{t("loan.detail.balanceDue")}</dt>
						<dd className="text-2xl font-bold text-amber-900">{formatAmount(loan.balance, loan.currency, locale)}</dd>
						<p className="text-xs text-amber-700/80 mt-1">{loan.currency}</p>
					</div>
					<dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.client")}</dt>
							<dd className="font-medium">
								{(loan.clientId ?? loan.client?.id) != null ? (
									<Link href={`/customers/${loan.clientId ?? loan.client?.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-mono">
										{loan.clientId ?? loan.client?.id}
									</Link>
								) : (
									<span className="text-gray-500">—</span>
								)}
							</dd>
						</div>
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.period")}</dt>
							<dd className="font-semibold text-gray-900 font-mono">{loan.periodMonths != null ? t("loan.detail.periodMonths", { count: loan.periodMonths }) : "—"}</dd>
						</div>
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.interestRate")}</dt>
							<dd className="font-semibold text-gray-900">{loan.interestRate != null ? `${Number(loan.interestRate)} %` : "—"}</dd>
						</div>
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.maturityDate")}</dt>
							<dd className="font-medium text-gray-900">{formatDate(loan.maturityDate)}</dd>
						</div>
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.status")}</dt>
							<dd>{getStatusBadge(loan.status)}</dd>
						</div>
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.openingAmount")}</dt>
							<dd className="font-medium text-gray-900">{loan.openingAmount != null ? formatAmount(loan.openingAmount, loan.currency, locale) : "—"}</dd>
						</div>
						{loan.disbursedAt != null && (
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.disbursedAt")}</dt>
								<dd className="font-medium text-gray-900">{formatDate(loan.disbursedAt)}</dd>
							</div>
						)}
					</dl>
				</div>
			</div>

			{/* Échéancier */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">{t("loan.detail.scheduleTitle")}</h2>
					</div>
					{schedule.length === 0 && (
						<Button variant="outline" size="sm" disabled={generatingSchedule} onClick={handleGenerateSchedule}>
							{generatingSchedule ? t("loan.detail.generating") : t("loan.detail.generateSchedule")}
						</Button>
					)}
				</div>
				{schedule.length === 0 ? (
					<div className="py-8 text-center text-gray-500">
						{generatingSchedule ? t("loan.detail.generatingMessage") : t("loan.detail.noSchedule")}
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.detail.table.number")}</th>
									<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.detail.table.dueDate")}</th>
									<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.detail.table.principal")}</th>
									<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.detail.table.interest")}</th>
									<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.detail.table.total")}</th>
									<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.detail.table.outstanding")}</th>
									<th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t("loan.detail.table.status")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{schedule.map((row) => (
									<tr key={row.id} className="hover:bg-gray-50">
										<td className="px-4 py-2 text-sm text-gray-900">{row.installmentNumber}</td>
										<td className="px-4 py-2 text-sm text-gray-600">{formatDate(row.dueDate)}</td>
										<td className="px-4 py-2 text-sm text-right">{formatAmount(row.principalAmount, loan.currency, locale)}</td>
										<td className="px-4 py-2 text-sm text-right">{formatAmount(row.interestAmount, loan.currency, locale)}</td>
										<td className="px-4 py-2 text-sm text-right font-medium">{formatAmount(row.totalAmount, loan.currency, locale)}</td>
										<td className="px-4 py-2 text-sm text-right">{formatAmount(row.outstandingPrincipal, loan.currency, locale)}</td>
										<td className="px-4 py-2 text-center">
											<Badge className={
												row.status === "PAID" ? "bg-green-100 text-green-800" :
												row.status === "OVERDUE" ? "bg-red-100 text-red-800" :
												row.status === "PARTIAL" ? "bg-amber-100 text-amber-800" :
												"bg-gray-100 text-gray-800"
											}>
												{row.status}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
							<tfoot className="bg-gray-100 border-t-2 border-gray-300">
								<tr>
									<td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900">{t("loan.detail.totals")}</td>
									<td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatAmount(scheduleTotals.totalPrincipal, loan.currency, locale)}</td>
									<td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatAmount(scheduleTotals.totalInterest, loan.currency, locale)}</td>
									<td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatAmount(scheduleTotals.totalAmount, loan.currency, locale)}</td>
									<td colSpan={2} className="px-4 py-3" />
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</div>

			{/* Modal Décaissement */}
			{showDisburseModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !disburseLoading && setShowDisburseModal(false)}>
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
						<h3 className="text-lg font-semibold text-gray-900">{t("loan.detail.disburseModalTitle")}</h3>
						<p className="text-sm text-gray-600">{t("loan.detail.disburseModalDesc")}</p>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.detail.disburseTargetAccount")}</label>
							{loadingAccounts ? (
								<p className="text-sm text-gray-500">{t("loan.detail.loading")}</p>
							) : clientAccounts.length === 0 ? (
								<p className="text-sm text-amber-700">{t("loan.detail.disburseNoAccounts")}</p>
							) : (
								<select
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
									value={selectedTargetId}
									onChange={(e) => setSelectedTargetId(e.target.value === "" ? "" : Number(e.target.value))}
								>
									<option value="">{t("loan.detail.disburseSelectAccount")}</option>
									{clientAccounts.map((acc) => (
										<option key={acc.id} value={acc.id}>
											{acc.accountNumber} — {acc.product?.name ?? acc.id} ({formatAmount(acc.balance, acc.currency, locale)})
										</option>
									))}
								</select>
							)}
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => !disburseLoading && setShowDisburseModal(false)} disabled={disburseLoading}>
								{t("loan.apply.cancel")}
							</Button>
							<Button
								onClick={handleDisburse}
								disabled={disburseLoading || selectedTargetId === "" || clientAccounts.length === 0}
							>
								{disburseLoading ? t("loan.detail.disburseLoading") : t("loan.detail.disburseConfirm")}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
