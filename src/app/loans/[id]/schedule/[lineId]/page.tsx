"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Badge from "@/components/ui/Badge";
import { loansApi } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import type { Account, LoanScheduleItem } from "@/types";

export default function LoanScheduleLineDetailPage() {
	const params = useParams();
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const accountId = params.id as string;
	const lineId = params.lineId as string;
	const [loan, setLoan] = useState<Account | null>(null);
	const [schedule, setSchedule] = useState<LoanScheduleItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!accountId || !lineId) return;
		setLoading(true);
		setError(null);
		Promise.all([
			loansApi.get(accountId),
			loansApi.getSchedule(accountId).catch(() => [])
		])
			.then(([loanData, scheduleData]) => {
				setLoan(loanData);
				setSchedule(scheduleData);
			})
			.catch((e: unknown) => setError((e as Error)?.message ?? "Erreur"))
			.finally(() => setLoading(false));
	}, [accountId, lineId]);

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString(locale);
	}

	const line = schedule.find((row) => String(row.id) === lineId);

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<Link href={`/loans/${accountId}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("loan.detail.backToLoan")}
					</Link>
				</div>
				<p className="text-gray-500">{t("common.loading")}</p>
			</div>
		);
	}
	if (error || !loan) {
		return (
			<div className="space-y-6">
				<div>
					<Link href={accountId ? `/loans/${accountId}` : "/loans"} className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("loan.detail.backToLoan")}
					</Link>
				</div>
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error ?? t("loan.detail.loadError")}
				</div>
			</div>
		);
	}
	if (!line) {
		return (
			<div className="space-y-6">
				<div>
					<Link href={`/loans/${accountId}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("loan.detail.backToLoan")}
					</Link>
				</div>
				<div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					{t("loan.detail.scheduleLineNotFound")}
				</div>
			</div>
		);
	}

	const currency = loan.currency ?? "XAF";

	return (
		<div className="space-y-6">
			{/* En-tête (comme les autres pages prêts) */}
			<div>
				<Link href={`/loans/${accountId}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("loan.detail.backToLoan")}
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("loan.detail.scheduleLineDetailTitle")}</h1>
					<p className="text-gray-600 mt-1">{t("loan.detail.scheduleLineInstallmentLabel", { number: line.installmentNumber })} — {loan.accountNumber}</p>
				</div>
			</div>

			{/* Carte contenu (pleine largeur, comme la fiche prêt) */}
			<div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						</div>
						<div>
							<h2 className="text-lg font-semibold text-white">{t("loan.detail.scheduleLineAmountsSection")}</h2>
							<p className="text-sm text-emerald-100">{formatDate(line.dueDate)}</p>
						</div>
					</div>
				</div>
				<div className="p-5 space-y-5">
					<dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.table.principal")}</dt>
							<dd className="text-lg font-bold text-gray-900">{formatAmount(line.principalAmount, currency, locale)}</dd>
						</div>
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.table.interest")}</dt>
							<dd className="text-lg font-bold text-gray-900">{formatAmount(line.interestAmount, currency, locale)}</dd>
						</div>
						<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.table.total")}</dt>
							<dd className="text-lg font-bold text-gray-900">{formatAmount(line.totalAmount, currency, locale)}</dd>
						</div>
					</dl>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="rounded-xl bg-amber-50/80 border border-amber-100 p-4">
							<p className="text-xs font-semibold uppercase tracking-wider text-amber-700/80 mb-1">{t("loan.detail.table.outstanding")}</p>
							<p className="text-xl font-bold text-amber-900">{formatAmount(line.outstandingPrincipal, currency, locale)}</p>
						</div>
						<div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
							<p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{t("loan.detail.table.status")}</p>
							<Badge className={
								line.status === "PAID" ? "bg-green-100 text-green-800 border-green-200" :
								line.status === "OVERDUE" ? "bg-red-100 text-red-800 border-red-200" :
								line.status === "PARTIAL" ? "bg-amber-100 text-amber-800 border-amber-200" :
								"bg-slate-100 text-slate-800 border-slate-200"
							}>
								{line.status}
							</Badge>
						</div>
					</div>

					{(Number(line.paidPrincipal ?? 0) > 0 || Number(line.paidInterest ?? 0) > 0) && (
						<div className="rounded-xl bg-green-50/80 border border-green-100 p-4">
							<h3 className="text-xs font-semibold uppercase tracking-wider text-green-800/80 mb-3">{t("loan.detail.scheduleLinePaymentsSection")}</h3>
							<dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div className="flex justify-between sm:block">
									<dt className="text-slate-600 text-sm">{t("loan.detail.scheduleLinePaidPrincipal")}</dt>
									<dd className="font-medium text-slate-900">{formatAmount(line.paidPrincipal ?? 0, currency, locale)}</dd>
								</div>
								<div className="flex justify-between sm:block">
									<dt className="text-slate-600 text-sm">{t("loan.detail.scheduleLinePaidInterest")}</dt>
									<dd className="font-medium text-slate-900">{formatAmount(line.paidInterest ?? 0, currency, locale)}</dd>
								</div>
								{line.paidAt && (
									<div className="flex justify-between sm:block">
										<dt className="text-slate-600 text-sm">{t("loan.detail.scheduleLinePaidAt")}</dt>
										<dd className="font-medium text-slate-900">{formatDate(line.paidAt)}</dd>
									</div>
								)}
							</dl>
						</div>
					)}

					<div className="pt-2 border-t border-gray-100">
						<Link
							href={`/loans/${accountId}`}
							className="inline-flex items-center justify-center rounded-md border h-9 px-4 text-sm hover:bg-gray-50 transition-colors"
						>
							{t("loan.detail.scheduleLineDetailClose")}
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
