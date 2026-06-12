"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { accountsApi, customersApi, loanApplicationsApi, loansApi, productsApi } from "@/lib/api";
import {
	estimateOpeningFeeAmount,
	findActiveOpeningFee,
	periodMonths,
	resolveAnnualRatePercent
} from "@/lib/loanApplicationUtils";
import { formatAmount } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import type { LoanApplication, LoanApplicationDetailContext, LoanApplicationStatus } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="px-6 py-3.5 flex flex-wrap justify-between items-start gap-2 sm:items-center">
			<dt className="text-sm font-medium text-gray-500 shrink-0">{label}</dt>
			<dd className="text-sm font-medium text-gray-900 text-right">{children}</dd>
		</div>
	);
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
			<div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
				<div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">{icon}</div>
				<h2 className="text-lg font-semibold text-gray-900">{title}</h2>
			</div>
			<dl className="divide-y divide-gray-100">{children}</dl>
		</div>
	);
}

export default function LoanApplicationDetailPage() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const params = useParams();
	const router = useRouter();
	const { showToast } = useToast();
	const id = params.id as string;
	const [app, setApp] = useState<LoanApplication | null>(null);
	const [context, setContext] = useState<LoanApplicationDetailContext>({});
	const [loading, setLoading] = useState(true);
	const [contextLoading, setContextLoading] = useState(false);
	const [deciding, setDeciding] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");

	const loadContext = useCallback(async (application: LoanApplication) => {
		setContextLoading(true);
		try {
			const [customer, product, fees, rates, sourceAccount, periods] = await Promise.all([
				customersApi.get(application.clientId).catch(() => null),
				productsApi.get(application.productId).catch(() => null),
				productsApi.getFees(application.productId).catch(() => []),
				productsApi.getInterestRates(application.productId).catch(() => []),
				application.sourceAccountId
					? accountsApi.get(application.sourceAccountId).catch(() => null)
					: Promise.resolve(null),
				application.period
					? Promise.resolve([])
					: productsApi.getPeriods(application.productId).catch(() => [])
			]);

			const period =
				application.period ??
				periods.find((p) => p.id === application.periodId) ??
				null;
			const openingFee = findActiveOpeningFee(fees, application.currency);
			const estimatedAnnualRate = resolveAnnualRatePercent(period, product, rates);
			const months = periodMonths(period);
			const simulation =
				estimatedAnnualRate != null && application.requestedAmount > 0
					? await loansApi.simulate(application.requestedAmount, estimatedAnnualRate, months).catch(() => null)
					: null;

			setContext({
				customer,
				product,
				period,
				sourceAccount,
				openingFee,
				simulation,
				estimatedOpeningFeeAmount: estimateOpeningFeeAmount(openingFee, application.requestedAmount),
				estimatedAnnualRate
			});
		} finally {
			setContextLoading(false);
		}
	}, []);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		try {
			const data = await loanApplicationsApi.get(id);
			setApp(data);
			await loadContext(data);
		} catch {
			showToast(t("loan.application.detailNotFound"), "error");
			router.push("/loans/applications");
		} finally {
			setLoading(false);
		}
	}, [id, loadContext, router, showToast, t]);

	useEffect(() => {
		load();
	}, [load]);

	const months = useMemo(() => periodMonths(context.period ?? app?.period), [context.period, app?.period]);
	const fmt = useCallback((amount: number, currency?: string) => formatAmount(amount, currency ?? app?.currency ?? "XAF", locale), [app?.currency, locale]);

	async function handleApprove() {
		if (!app || app.status !== "PENDING") return;
		setDeciding(true);
		try {
			await loanApplicationsApi.decide(app.id, { approved: true });
			showToast(t("loan.application.approved"), "success");
			load();
		} catch (e: unknown) {
			showToast((e as Error)?.message ?? t("loan.application.detailApproveError"), "error");
		} finally {
			setDeciding(false);
		}
	}

	async function handleReject() {
		if (!app || app.status !== "PENDING") return;
		setDeciding(true);
		try {
			await loanApplicationsApi.decide(app.id, {
				approved: false,
				rejectionReason: rejectionReason.trim() || t("loan.application.detailRejectDefaultReason")
			});
			showToast(t("loan.application.rejected"), "success");
			setShowRejectModal(false);
			setRejectionReason("");
			load();
		} catch (e: unknown) {
			showToast((e as Error)?.message ?? t("loan.application.detailRejectError"), "error");
		} finally {
			setDeciding(false);
		}
	}

	function statusBadge(status: LoanApplicationStatus) {
		const map: Record<LoanApplicationStatus, { className: string; label: string }> = {
			PENDING: { className: "bg-amber-100 text-amber-800", label: t("loan.application.statusPending") },
			APPROVED: { className: "bg-green-100 text-green-800", label: t("loan.application.statusApproved") },
			REJECTED: { className: "bg-red-100 text-red-800", label: t("loan.application.statusRejected") }
		};
		const s = map[status];
		return <Badge className={s.className}>{s.label}</Badge>;
	}

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
	}

	function formatDuration() {
		const period = context.period ?? app?.period;
		if (!period) return "—";
		const parts: string[] = [];
		if (period.periodMonths) parts.push(t("loan.application.detailDurationMonths", { count: period.periodMonths }));
		else if (period.periodYears) parts.push(t("loan.application.detailDurationYears", { count: period.periodYears }));
		if (period.periodDays) parts.push(t("loan.application.detailDurationDays", { count: period.periodDays }));
		return parts.length > 0 ? parts.join(" · ") : `${months} ${t("loan.application.detailMonthsShort")}`;
	}

	const needsSourceForFees =
		(context.estimatedOpeningFeeAmount ?? 0) > 0 && !app?.sourceAccountId && app?.status === "PENDING";

	if (loading && !app) {
		return (
			<div className="space-y-6">
				<div className="h-9 w-72 bg-gray-200 rounded animate-pulse" />
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
					))}
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
					<div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
				</div>
			</div>
		);
	}

	if (!app) return null;

	return (
		<div className="space-y-6">
			<div>
				<Link
					href="/loans/applications"
					className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("loan.application.backToList")}
				</Link>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							{t("loan.application.detailTitle", { number: app.applicationNumber })}
						</h1>
						<p className="text-gray-600 mt-1">{t("loan.application.detailSubtitle")}</p>
						<p className="text-xs text-gray-400 mt-1">
							{t("loan.application.detailRef")} #{app.id}
						</p>
					</div>
					<div className="flex items-center gap-3">
						{statusBadge(app.status)}
						<Link href="/loans/applications">
							<Button variant="outline" size="sm">{t("loan.application.listLoansList")}</Button>
						</Link>
					</div>
				</div>
			</div>

			{app.status === "APPROVED" && app.accountId && (
				<div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="text-sm font-medium text-green-800">{t("loan.application.detailLoanCreated")}</p>
						<p className="text-lg font-semibold text-green-900 mt-1">
							{app.account?.accountNumber ?? t("loan.application.detailViewLoan", { id: app.accountId })}
						</p>
						{app.account?.disbursedAt == null && (
							<p className="text-sm text-green-700 mt-1">{t("loan.application.detailAwaitingDisbursement")}</p>
						)}
					</div>
					<Link href={`/loans/${app.accountId}`}>
						<Button size="sm">{t("loan.application.detailOpenLoan")}</Button>
					</Link>
				</div>
			)}

			{app.status === "REJECTED" && app.rejectionReason && (
				<div className="bg-red-50 border border-red-200 rounded-xl p-5">
					<p className="text-sm font-medium text-red-800 mb-2">{t("loan.application.detailRejectionReason")}</p>
					<p className="text-sm text-red-900">{app.rejectionReason}</p>
				</div>
			)}

			{needsSourceForFees && (
				<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
					{t("loan.application.detailSourceAccountWarning")}
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
					<div className="text-sm font-medium text-blue-700">{t("loan.application.detailRequestedAmount")}</div>
					<div className="text-2xl font-bold text-blue-900 mt-1">{fmt(app.requestedAmount, app.currency)}</div>
				</div>
				<div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
					<div className="text-sm font-medium text-gray-500">{t("loan.application.detailDuration")}</div>
					<div className="text-xl font-bold text-gray-900 mt-1">{contextLoading ? "…" : formatDuration()}</div>
				</div>
				<div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
					<div className="text-sm font-medium text-gray-500">{t("loan.application.detailEstimatedRate")}</div>
					<div className="text-xl font-bold text-gray-900 mt-1">
						{contextLoading
							? "…"
							: context.estimatedAnnualRate != null
								? `${context.estimatedAnnualRate.toLocaleString(locale)} %`
								: "—"}
					</div>
				</div>
				<div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
					<div className="text-sm font-medium text-gray-500">{t("loan.application.detailEstimatedMonthly")}</div>
					<div className="text-xl font-bold text-gray-900 mt-1">
						{contextLoading
							? "…"
							: context.simulation
								? fmt(context.simulation.monthlyPayment, app.currency)
								: "—"}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<SectionCard
					title={t("loan.application.detailClientSection")}
					icon={
						<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					}
				>
					<DetailRow label={t("loan.application.detailClient")}>
						<Link href={`/customers/${app.clientId}`} className="text-blue-600 hover:underline">
							{context.customer?.displayName ?? app.client?.displayName ?? `#${app.clientId}`}
						</Link>
					</DetailRow>
					{(context.customer?.email ?? app.client?.email) && (
						<DetailRow label={t("loan.application.detailEmail")}>{context.customer?.email ?? app.client?.email}</DetailRow>
					)}
					{context.customer?.phone && (
						<DetailRow label={t("loan.application.detailPhone")}>{context.customer.phone}</DetailRow>
					)}
					{context.customer?.status && (
						<DetailRow label={t("loan.application.detailClientStatus")}>
							<Badge className="bg-gray-100 text-gray-800">{context.customer.status}</Badge>
						</DetailRow>
					)}
					{context.customer?.riskScore != null && (
						<DetailRow label={t("loan.application.detailRiskScore")}>{context.customer.riskScore}</DetailRow>
					)}
				</SectionCard>

				<SectionCard
					title={t("loan.application.detailProductSection")}
					icon={
						<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
						</svg>
					}
				>
					<DetailRow label={t("loan.application.detailProduct")}>
						<Link href={`/products/${app.productId}`} className="text-blue-600 hover:underline">
							{context.product?.name ?? app.product?.name ?? `#${app.productId}`}
						</Link>
					</DetailRow>
					<DetailRow label={t("loan.application.detailProductCode")}>
						{context.product?.code ?? app.product?.code ?? "—"}
					</DetailRow>
					<DetailRow label={t("loan.application.detailCurrency")}>{app.currency}</DetailRow>
					{(context.product?.minBalance != null || context.product?.maxBalance != null) && (
						<DetailRow label={t("loan.application.detailAmountRange")}>
							{context.product?.minBalance != null ? fmt(context.product.minBalance, app.currency) : "—"}
							{" → "}
							{context.product?.maxBalance != null ? fmt(context.product.maxBalance, app.currency) : "—"}
						</DetailRow>
					)}
					{context.product?.description && (
						<div className="px-6 py-3.5">
							<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.application.detailDescription")}</dt>
							<dd className="text-sm text-gray-700">{context.product.description}</dd>
						</div>
					)}
				</SectionCard>

				<SectionCard
					title={t("loan.application.detailPeriodSection")}
					icon={
						<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					}
				>
					<DetailRow label={t("loan.application.detailPeriod")}>
						{context.period?.periodName ?? app.period?.periodName ?? `#${app.periodId}`}
					</DetailRow>
					<DetailRow label={t("loan.application.detailDuration")}>{formatDuration()}</DetailRow>
					{(context.period?.interestRate ?? app.period?.interestRate) != null && (
						<DetailRow label={t("loan.application.detailPeriodRate")}>
							{(context.period?.interestRate ?? app.period?.interestRate)!.toLocaleString(locale)} %
						</DetailRow>
					)}
					{(context.period?.minAmount != null || context.period?.maxAmount != null) && (
						<DetailRow label={t("loan.application.detailPeriodAmountRange")}>
							{context.period?.minAmount != null ? fmt(context.period.minAmount, app.currency) : "—"}
							{" → "}
							{context.period?.maxAmount != null ? fmt(context.period.maxAmount, app.currency) : "—"}
						</DetailRow>
					)}
				</SectionCard>

				<SectionCard
					title={t("loan.application.detailFinancingSection")}
					icon={
						<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					}
				>
					<DetailRow label={t("loan.application.detailSourceAccount")}>
						{app.sourceAccountId ? (
							context.sourceAccount ? (
								<Link href={`/accounts/${app.sourceAccountId}`} className="text-blue-600 hover:underline">
									{context.sourceAccount.accountNumber}
								</Link>
							) : (
								`#${app.sourceAccountId}`
							)
						) : (
							<span className="text-gray-500">{t("loan.apply.noSourceAccount")}</span>
						)}
					</DetailRow>
					{context.sourceAccount && (
						<DetailRow label={t("loan.application.detailSourceBalance")}>
							{fmt(context.sourceAccount.availableBalance ?? context.sourceAccount.balance, context.sourceAccount.currency)}
						</DetailRow>
					)}
					<DetailRow label={t("loan.application.detailOpeningFee")}>
						{context.openingFee ? (
							<span>
								{context.openingFee.feeName}
								{context.estimatedOpeningFeeAmount != null && context.estimatedOpeningFeeAmount > 0 && (
									<span className="block text-gray-600 font-normal mt-0.5">
										≈ {fmt(context.estimatedOpeningFeeAmount, app.currency)}
									</span>
								)}
							</span>
						) : (
							<span className="text-gray-500">{t("loan.application.detailNoOpeningFee")}</span>
						)}
					</DetailRow>
				</SectionCard>

				{context.simulation && (
					<SectionCard
						title={t("loan.application.detailSimulationSection")}
						icon={
							<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
						}
					>
						<DetailRow label={t("loan.application.detailEstimatedMonthly")}>
							{fmt(context.simulation.monthlyPayment, app.currency)}
						</DetailRow>
						<DetailRow label={t("loan.application.detailTotalInterest")}>
							{fmt(context.simulation.totalInterest, app.currency)}
						</DetailRow>
						<DetailRow label={t("loan.application.detailTotalRepayment")}>
							{fmt(context.simulation.totalPayment, app.currency)}
						</DetailRow>
						<p className="px-6 py-3 text-xs text-gray-500">{t("loan.application.detailSimulationHint")}</p>
					</SectionCard>
				)}

				<SectionCard
					title={t("loan.application.detailTimelineSection")}
					icon={
						<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					}
				>
					<DetailRow label={t("loan.application.detailRequestedAt")}>{formatDate(app.requestedAt)}</DetailRow>
					{app.requestedBy != null && (
						<DetailRow label={t("loan.application.detailRequestedBy")}>#{app.requestedBy}</DetailRow>
					)}
					{app.decidedAt && (
						<DetailRow label={t("loan.application.detailDecidedAt")}>{formatDate(app.decidedAt)}</DetailRow>
					)}
					{app.decidedBy != null && (
						<DetailRow label={t("loan.application.detailDecidedBy")}>#{app.decidedBy}</DetailRow>
					)}
					{app.createdAt && (
						<DetailRow label={t("loan.application.detailCreatedAt")}>{formatDate(app.createdAt)}</DetailRow>
					)}
					{app.updatedAt && (
						<DetailRow label={t("loan.application.detailUpdatedAt")}>{formatDate(app.updatedAt)}</DetailRow>
					)}
				</SectionCard>
			</div>

			{app.status === "PENDING" && (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-2">{t("loan.application.detailDecisionSection")}</h2>
					<p className="text-sm text-gray-600 mb-4">{t("loan.application.detailDecisionHint")}</p>
					<div className="flex flex-wrap gap-3">
						<Button onClick={handleApprove} disabled={deciding} className="flex items-center gap-2">
							{deciding ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : null}
							{t("loan.application.detailApprove")}
						</Button>
						<Button variant="outline" onClick={() => setShowRejectModal(true)} disabled={deciding}>
							{t("loan.application.detailReject")}
						</Button>
					</div>
				</div>
			)}

			{showRejectModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="fixed inset-0 bg-gray-500/75" onClick={() => setShowRejectModal(false)} />
					<div className="flex min-h-full items-center justify-center p-4">
						<div className="relative bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-200">
							<div className="px-6 py-4 border-b border-gray-200">
								<h3 className="text-lg font-semibold text-gray-900">{t("loan.application.detailRejectModalTitle")}</h3>
								<p className="text-sm text-gray-500 mt-1">{t("loan.application.detailRejectModalDesc")}</p>
							</div>
							<div className="px-6 py-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.application.detailRejectReasonLabel")}</label>
								<textarea
									rows={3}
									value={rejectionReason}
									onChange={(e) => setRejectionReason(e.target.value)}
									placeholder={t("loan.application.detailRejectReasonPlaceholder")}
									className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
								/>
							</div>
							<div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
								<Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectionReason(""); }}>
									{t("loan.apply.cancel")}
								</Button>
								<Button
									variant="outline"
									className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
									onClick={handleReject}
									disabled={deciding}
								>
									{deciding ? t("loan.application.detailRejecting") : t("loan.application.detailReject")}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
