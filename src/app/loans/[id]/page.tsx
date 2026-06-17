"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { loansApi, accountsApi, transactionsApi } from "@/lib/api";
import { sumScheduleDueAmounts } from "@/lib/loanScheduleUtils";
import { parseLoanRepaymentMetadata } from "@/lib/loanRepaymentUtils";
import { formatAmount } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { Eye } from "lucide-react";
import type {
	Account,
	AccountStatus,
	LoanBalanceBreakdown,
	LoanAccountAccountingEntry,
	LoanCreditClassification,
	LoanClassificationStage,
	LoanStageRemissionRequest,
	LoanStageRemissionRequestStatus,
	LoanScheduleItem,
	PaymentMethod
} from "@/types";
import { LOAN_CLASSIFICATION_STAGE_ORDER } from "@/types";
import type { Transaction, TransactionStatus } from "@/types/transaction";

type LoanDetailTab = "overview" | "schedule" | "repayments" | "accountingEntries" | "classification";

export default function LoanDetailPage() {
	const params = useParams();
	const { t, i18n } = useTranslation();
	const { showToast } = useToast();
	const { user } = useAuth();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const accountId = params.id as string;
	const [loan, setLoan] = useState<Account | null>(null);
	const [schedule, setSchedule] = useState<LoanScheduleItem[]>([]);
	const [balanceBreakdown, setBalanceBreakdown] = useState<LoanBalanceBreakdown | null>(null);
	const [classification, setClassification] = useState<LoanCreditClassification | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [generatingSchedule, setGeneratingSchedule] = useState(false);
	const [showDisburseModal, setShowDisburseModal] = useState(false);
	const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
	const [selectedTargetId, setSelectedTargetId] = useState<number | "">("");
	const [disburseLoading, setDisburseLoading] = useState(false);
	const [loadingAccounts, setLoadingAccounts] = useState(false);
	const [showRepayModal, setShowRepayModal] = useState(false);
	const [repaySourceAccountId, setRepaySourceAccountId] = useState<number | "">("");
	const [repayAmount, setRepayAmount] = useState("");
	const [repayLoading, setRepayLoading] = useState(false);
	const [repayAccounts, setRepayAccounts] = useState<Account[]>([]);
	const [loadingRepayAccounts, setLoadingRepayAccounts] = useState(false);
	const [repayPaymentMethods, setRepayPaymentMethods] = useState<PaymentMethod[]>([]);
	const [repayPaymentMethodId, setRepayPaymentMethodId] = useState<number | "">("");
	const [loadingRepayPaymentMethods, setLoadingRepayPaymentMethods] = useState(false);
	const [activeTab, setActiveTab] = useState<LoanDetailTab>("overview");
	const [repayments, setRepayments] = useState<Transaction[]>([]);
	const [repaymentsLoading, setRepaymentsLoading] = useState(false);
	const [accountingEntries, setAccountingEntries] = useState<LoanAccountAccountingEntry[]>([]);
	const [accountingEntriesLoading, setAccountingEntriesLoading] = useState(false);
	const [selectedAccountingEntry, setSelectedAccountingEntry] = useState<LoanAccountAccountingEntry | null>(null);
	const [remissionRequests, setRemissionRequests] = useState<LoanStageRemissionRequest[]>([]);
	const [remissionRequestsLoading, setRemissionRequestsLoading] = useState(false);
	const [showRemissionModal, setShowRemissionModal] = useState(false);
	const [remissionTargetStage, setRemissionTargetStage] = useState<LoanClassificationStage | "">("");
	const [remissionReason, setRemissionReason] = useState("");
	const [remissionSubmitting, setRemissionSubmitting] = useState(false);
	const [showRejectRemissionModal, setShowRejectRemissionModal] = useState(false);
	const [rejectRemissionReason, setRejectRemissionReason] = useState("");
	const [remissionDeciding, setRemissionDeciding] = useState(false);
	const [selectedRemissionRequest, setSelectedRemissionRequest] = useState<LoanStageRemissionRequest | null>(null);

	const loanTabs = useMemo(
		() => [
			{ id: "overview" as const, label: t("loan.detail.tabs.overview") },
			{ id: "schedule" as const, label: t("loan.detail.tabs.schedule"), count: schedule.length },
			{ id: "repayments" as const, label: t("loan.detail.tabs.repayments"), count: repayments.length },
			{ id: "accountingEntries" as const, label: t("loan.detail.tabs.accountingEntries"), count: accountingEntries.length },
			{ id: "classification" as const, label: t("loan.detail.tabs.classification") }
		],
		[t, schedule.length, repayments.length, accountingEntries.length]
	);

	async function load() {
		if (!accountId) return;
		setLoading(true);
		setError(null);
		try {
			// balance-breakdown resynchronise le solde compte (CRD + pénalités) : l'appeler avant get(loan)
			const breakdownData = await loansApi.getBalanceBreakdown(accountId).catch(() => null);
			const [loanData, scheduleData, classificationData, repaymentsData] = await Promise.all([
				loansApi.get(accountId),
				loansApi.getSchedule(accountId).catch(() => []),
				loansApi.getClassification(accountId).catch(() => null),
				transactionsApi.list({ accountId: Number(accountId), type: "LOAN_REPAYMENT", size: 100 }).catch(() => ({ content: [] }))
			]);
			setLoan(loanData);
			setSchedule(scheduleData);
			setBalanceBreakdown(breakdownData ?? null);
			setClassification(classificationData ?? null);
			setRepayments(repaymentsData.content ?? []);
		} catch (e: any) {
			setError(e?.message ?? t("loan.detail.loadError"));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [accountId]);

	async function loadRepayments() {
		if (!accountId) return;
		setRepaymentsLoading(true);
		try {
			const result = await transactionsApi.list({
				accountId: Number(accountId),
				type: "LOAN_REPAYMENT",
				size: 100
			});
			setRepayments(result.content ?? []);
		} catch {
			setRepayments([]);
		} finally {
			setRepaymentsLoading(false);
		}
	}

	useEffect(() => {
		if (activeTab === "repayments" && accountId) {
			void loadRepayments();
		}
	}, [activeTab, accountId]);

	async function loadAccountingEntries() {
		if (!accountId) return;
		setAccountingEntriesLoading(true);
		try {
			const entries = await loansApi.getAccountingEntries(accountId);
			setAccountingEntries(entries);
		} catch {
			setAccountingEntries([]);
		} finally {
			setAccountingEntriesLoading(false);
		}
	}

	useEffect(() => {
		if (activeTab === "accountingEntries" && accountId) {
			void loadAccountingEntries();
		}
	}, [activeTab, accountId]);

	async function loadRemissionRequests() {
		if (!accountId) return;
		setRemissionRequestsLoading(true);
		try {
			const requests = await loansApi.listStageRemissionRequests(accountId);
			setRemissionRequests(requests);
		} catch {
			setRemissionRequests([]);
		} finally {
			setRemissionRequestsLoading(false);
		}
	}

	useEffect(() => {
		if (activeTab === "classification" && accountId) {
			void loadRemissionRequests();
		}
	}, [activeTab, accountId]);

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
				(a) =>
					a.id !== loan?.id &&
					a.status === "ACTIVE" &&
					(a.product?.category === "CURRENT_ACCOUNT" || a.product?.category === "SAVINGS_ACCOUNT")
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


	async function openRepayModal() {
		if (!clientId) return;
		setShowRepayModal(true);
		setRepaySourceAccountId("");
		setRepayAmount("");
		setLoadingRepayAccounts(true);
		setError(null);
		try {
			const accounts = await accountsApi.getClientAccounts(clientId);
			const eligible = accounts.filter((a) => a.id !== loan?.id && a.status === "ACTIVE");
			setRepayAccounts(eligible);
		} catch (e: any) {
			showToast(e?.message ?? t("loan.detail.repayError"), "error");
		} finally {
			setLoadingRepayAccounts(false);
		}
	}

	async function handleRepay() {
		if (!accountId || repaySourceAccountId === "" || !repayAmount) return;
		const amount = Number(repayAmount);
		if (isNaN(amount) || amount <= 0) {
			showToast(t("loan.detail.repayAmountInvalid"), "error");
			return;
		}
		setRepayLoading(true);
		setError(null);
		try {
			const result = await loansApi.repay(accountId, {
				sourceAccountId: repaySourceAccountId as number,
				amount
			});
			const penaltyPart = Number(result.penaltyAllocation ?? 0);
			if (penaltyPart > 0) {
				showToast(
					t("loan.detail.repaySuccessWithPenalty", {
						penalty: formatAmount(penaltyPart, loan?.currency ?? "XAF", locale),
						schedule: formatAmount(amount - penaltyPart, loan?.currency ?? "XAF", locale)
					}),
					"success"
				);
			} else {
				showToast(t("loan.detail.repaySuccess"), "success");
			}
			setShowRepayModal(false);
			await load();
		} catch (e: any) {
			showToast(e?.message ?? t("loan.detail.repayError"), "error");
		} finally {
			setRepayLoading(false);
		}
	}

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString(locale);
	}

	function formatDateTime(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleString(locale);
	}

	function getTransactionStatusBadge(status: TransactionStatus) {
		const colors: Record<TransactionStatus, string> = {
			PENDING: "bg-yellow-100 text-yellow-800",
			PROCESSING: "bg-blue-100 text-blue-800",
			COMPLETED: "bg-green-100 text-green-800",
			FAILED: "bg-red-100 text-red-800",
			REVERSED: "bg-gray-100 text-gray-800"
		};
		return <Badge className={colors[status]}>{status}</Badge>;
	}

	function getClassificationStageBadge(stage: LoanClassificationStage) {
		const colors: Record<LoanClassificationStage, string> = {
			PERFORMING: "bg-green-100 text-green-800",
			UNPAID: "bg-yellow-100 text-yellow-800",
			NON_PERFORMING: "bg-orange-100 text-orange-800",
			DOUBTFUL: "bg-red-100 text-red-800"
		};
		return (
			<Badge className={colors[stage]}>
				{t(`loan.detail.classification.stage.${stage}`)}
			</Badge>
		);
	}

	function getRemissionStatusBadge(status: LoanStageRemissionRequestStatus) {
		const map: Record<LoanStageRemissionRequestStatus, string> = {
			PENDING: "bg-amber-100 text-amber-800",
			APPROVED: "bg-green-100 text-green-800",
			REJECTED: "bg-red-100 text-red-800",
			CANCELLED: "bg-gray-100 text-gray-800"
		};
		return (
			<Badge className={map[status]}>
				{t(`loan.detail.classification.remission.status.${status}`)}
			</Badge>
		);
	}

	function getLowerClassificationStages(stage: LoanClassificationStage): LoanClassificationStage[] {
		const idx = LOAN_CLASSIFICATION_STAGE_ORDER.indexOf(stage);
		if (idx <= 0) return [];
		return LOAN_CLASSIFICATION_STAGE_ORDER.slice(0, idx) as LoanClassificationStage[];
	}

	const pendingRemissionRequest = useMemo(
		() => remissionRequests.find((r) => r.status === "PENDING") ?? null,
		[remissionRequests]
	);

	const remissionTargetOptions = useMemo(() => {
		if (!classification) return [] as LoanClassificationStage[];
		return getLowerClassificationStages(classification.classificationStage);
	}, [classification]);

	const canRequestRemission =
		loan?.status === "ACTIVE" &&
		loan?.disbursedAt != null &&
		classification != null &&
		classification.classificationStage !== "PERFORMING" &&
		pendingRemissionRequest == null;

	const currentUserId = user?.id ?? 0;
	const canApprovePendingRemission =
		pendingRemissionRequest != null &&
		pendingRemissionRequest.requestedBy != null &&
		pendingRemissionRequest.requestedBy !== currentUserId;
	const canCancelPendingRemission =
		pendingRemissionRequest != null &&
		pendingRemissionRequest.requestedBy === currentUserId;

	async function handleSubmitRemissionRequest() {
		if (!accountId || remissionTargetStage === "") return;
		const reason = remissionReason.trim();
		if (reason.length < 20) {
			showToast(t("loan.detail.classification.remission.reasonTooShort"), "error");
			return;
		}
		setRemissionSubmitting(true);
		try {
			await loansApi.submitStageRemissionRequest(accountId, {
				targetStage: remissionTargetStage,
				reason
			});
			showToast(t("loan.detail.classification.remission.submitted"), "success");
			setShowRemissionModal(false);
			setRemissionReason("");
			setRemissionTargetStage("");
			await Promise.all([load(), loadRemissionRequests()]);
		} catch (e: unknown) {
			showToast((e as Error)?.message ?? t("loan.detail.classification.remission.submitError"), "error");
		} finally {
			setRemissionSubmitting(false);
		}
	}

	async function handleApproveRemissionRequest(request: LoanStageRemissionRequest) {
		setRemissionDeciding(true);
		try {
			await loansApi.approveStageRemissionRequest(request.id);
			showToast(t("loan.detail.classification.remission.approved"), "success");
			await Promise.all([load(), loadRemissionRequests()]);
		} catch (e: unknown) {
			showToast((e as Error)?.message ?? t("loan.detail.classification.remission.approveError"), "error");
		} finally {
			setRemissionDeciding(false);
		}
	}

	async function handleRejectRemissionRequest() {
		if (!selectedRemissionRequest) return;
		const reason = rejectRemissionReason.trim();
		if (reason.length < 20) {
			showToast(t("loan.detail.classification.remission.reasonTooShort"), "error");
			return;
		}
		setRemissionDeciding(true);
		try {
			await loansApi.rejectStageRemissionRequest(selectedRemissionRequest.id, { reason });
			showToast(t("loan.detail.classification.remission.rejected"), "success");
			setShowRejectRemissionModal(false);
			setRejectRemissionReason("");
			setSelectedRemissionRequest(null);
			await loadRemissionRequests();
		} catch (e: unknown) {
			showToast((e as Error)?.message ?? t("loan.detail.classification.remission.rejectError"), "error");
		} finally {
			setRemissionDeciding(false);
		}
	}

	async function handleCancelRemissionRequest(request: LoanStageRemissionRequest) {
		setRemissionDeciding(true);
		try {
			await loansApi.cancelStageRemissionRequest(request.id);
			showToast(t("loan.detail.classification.remission.cancelled"), "success");
			await loadRemissionRequests();
		} catch (e: unknown) {
			showToast((e as Error)?.message ?? t("loan.detail.classification.remission.cancelError"), "error");
		} finally {
			setRemissionDeciding(false);
		}
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

	// Décomposition : reste échéancier (principal+intérêts) vs pénalités — priorité au breakdown serveur (même logique que le remboursement)
	const { scheduleRemaining, penaltyBalance, capitalRemaining, interestRemaining, totalDue } = useMemo(() => {
		if (balanceBreakdown != null) {
			const schedule = Number(balanceBreakdown.scheduleRemaining ?? 0);
			const penalty = Number(balanceBreakdown.penaltyBalance ?? 0);
			return {
				scheduleRemaining: schedule,
				penaltyBalance: penalty,
				capitalRemaining: Number(balanceBreakdown.capitalRemaining ?? 0),
				interestRemaining: Number(balanceBreakdown.interestRemaining ?? 0),
				totalDue: Number(balanceBreakdown.totalDue ?? schedule + penalty)
			};
		}
		const { capitalRemaining: capitalDue, interestRemaining: interestDue, scheduleRemaining: remaining } =
			sumScheduleDueAmounts(schedule);
		const disbursed = loan?.disbursedAt != null;
		const capitalRem = disbursed ? capitalDue : 0;
		const interestRem = disbursed ? interestDue : 0;
		const penalty = Math.max(0, Number(loan?.balance ?? 0) - capitalRem);
		return {
			scheduleRemaining: remaining,
			penaltyBalance: penalty,
			capitalRemaining: capitalRem,
			interestRemaining: interestRem,
			totalDue: remaining + penalty
		};
	}, [schedule, loan?.balance, loan?.disbursedAt, balanceBreakdown]);

	const canRepay =
		loan?.status === "ACTIVE" &&
		loan?.disbursedAt != null &&
		totalDue > 0;

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
						{canRepay && (
							<Button size="sm" variant="outline" onClick={openRepayModal}>
								{t("loan.detail.repay")}
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

			{/* Indicateurs clés — toujours visibles */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-200 shadow-sm">
					<dt className="text-sm font-medium text-blue-800 mb-1">{t("loan.detail.capitalRemaining")}</dt>
					<dd className="text-xl font-bold text-blue-900">{formatAmount(capitalRemaining, loan.currency, locale)}</dd>
					<p className="text-xs text-blue-700/80 mt-1">{t("loan.detail.capitalRemainingHint")}</p>
				</div>
				<div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 shadow-sm">
					<dt className="text-sm font-medium text-violet-800 mb-1">{t("loan.detail.interestRemaining")}</dt>
					<dd className="text-xl font-bold text-violet-900">{formatAmount(interestRemaining, loan.currency, locale)}</dd>
					<p className="text-xs text-violet-700/80 mt-1">{t("loan.detail.interestRemainingHint")}</p>
				</div>
				<div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 shadow-sm">
					<dt className="text-sm font-medium text-slate-700 mb-1">{t("loan.detail.scheduleRemaining")}</dt>
					<dd className="text-xl font-bold text-slate-900">{formatAmount(scheduleRemaining, loan.currency, locale)}</dd>
					<p className="text-xs text-slate-600 mt-1">{t("loan.detail.scheduleRemainingHint")}</p>
				</div>
				<div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 shadow-sm">
					<dt className="text-sm font-medium text-amber-800 mb-1">{t("loan.detail.penaltyBalance")}</dt>
					<dd className="text-xl font-bold text-amber-900">{formatAmount(penaltyBalance, loan.currency, locale)}</dd>
					<p className="text-xs text-amber-700/80 mt-1">{t("loan.detail.penaltyBalanceHint")}</p>
				</div>
				<div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-200 shadow-sm">
					<dt className="text-sm font-medium text-indigo-800 mb-1">{t("loan.detail.totalDue")}</dt>
					<dd className="text-2xl font-bold text-indigo-900">{formatAmount(totalDue, loan.currency, locale)}</dd>
					<p className="text-xs text-indigo-700/80 mt-1">{t("loan.detail.totalDueHint")}</p>
				</div>
			</div>

			{/* Onglets */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="border-b border-gray-200 px-4 pt-2">
					<div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={t("loan.detail.tabs.aria")}>
						{loanTabs.map((tab) => (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={activeTab === tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
									activeTab === tab.id
										? "border-indigo-500 text-indigo-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								{tab.label}
								{tab.id === "schedule" && tab.count != null && tab.count > 0 && (
									<span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
										{tab.count}
									</span>
								)}
								{tab.id === "repayments" && tab.count != null && tab.count > 0 && (
									<span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
										{tab.count}
									</span>
								)}
								{tab.id === "accountingEntries" && tab.count != null && tab.count > 0 && (
									<span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
										{tab.count}
									</span>
								)}
								{tab.id === "classification" && classification != null && (
									<span className="hidden sm:inline-flex">{getClassificationStageBadge(classification.classificationStage)}</span>
								)}
							</button>
						))}
					</div>
				</div>

				<div className="p-5">
					{activeTab === "overview" && (
						<div className="space-y-4">
							<div className="flex items-center gap-3 pb-2 border-b border-gray-100">
								<div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
									<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
									</svg>
								</div>
								<div>
									<h2 className="text-lg font-semibold text-gray-900">{t("loan.detail.cardTitle")}</h2>
									<p className="text-sm text-gray-500">{loan.product?.name ?? "—"}</p>
								</div>
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
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
									<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.balanceDue")}</dt>
									<dd className="font-semibold text-gray-900">{formatAmount(totalDue, loan.currency, locale)}</dd>
									<p className="text-xs text-gray-500 mt-1">{t("loan.detail.totalDueHint")}</p>
								</div>
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
									<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.capitalRemaining")}</dt>
									<dd className="font-semibold text-gray-900">{formatAmount(capitalRemaining, loan.currency, locale)}</dd>
								</div>
								{loan.disbursedAt != null && (
									<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
										<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.disbursedAt")}</dt>
										<dd className="font-medium text-gray-900">{formatDate(loan.disbursedAt)}</dd>
									</div>
								)}
								{classification != null && (
									<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
										<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.detail.classification.title")}</dt>
										<dd>{getClassificationStageBadge(classification.classificationStage)}</dd>
									</div>
								)}
							</dl>
						</div>
					)}

					{activeTab === "schedule" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between flex-wrap gap-3">
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
								<div className="py-12 text-center text-gray-500 rounded-lg border border-dashed border-gray-200">
									{generatingSchedule ? t("loan.detail.generatingMessage") : t("loan.detail.noSchedule")}
								</div>
							) : (
								<div className="overflow-x-auto rounded-lg border border-gray-200">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.number")}</th>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.dueDate")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.principal")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.interest")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.total")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.outstanding")}</th>
												<th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.status")}</th>
												<th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">{t("loan.detail.table.detail")}</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200 text-sm">
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
													<td className="px-4 py-2 text-center">
														<Link
															href={`/loans/${accountId}/schedule/${row.id}`}
															className="inline-flex items-center justify-center rounded-md border h-8 px-3 text-sm hover:bg-gray-50 transition-colors"
														>
															{t("loan.detail.table.detail")}
														</Link>
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
												<td colSpan={3} className="px-4 py-3" />
											</tr>
										</tfoot>
									</table>
								</div>
							)}
						</div>
					)}

					{activeTab === "repayments" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
									<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
								</div>
								<div>
									<h2 className="text-lg font-semibold text-gray-900">{t("loan.detail.repayments.title")}</h2>
									<p className="text-sm text-gray-500">{t("loan.detail.repayments.subtitle")}</p>
								</div>
							</div>
							{repaymentsLoading ? (
								<div className="py-12 text-center text-gray-500">{t("loan.detail.repayments.loading")}</div>
							) : repayments.length === 0 ? (
								<div className="py-12 text-center text-gray-500 rounded-lg border border-dashed border-gray-200">
									{t("loan.detail.repayments.empty")}
								</div>
							) : (
								<div className="overflow-x-auto rounded-lg border border-gray-200">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.date")}</th>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.reference")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.amount")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.penalty")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.interest")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.principal")}</th>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.sourceAccount")}</th>
												<th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.status")}</th>
												<th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">{t("loan.detail.repayments.table.detail")}</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200 text-sm">
											{repayments.map((tx) => {
												const meta = parseLoanRepaymentMetadata(tx.metadata);
												return (
													<tr key={tx.id} className="hover:bg-gray-50">
														<td className="px-4 py-2 text-gray-600 whitespace-nowrap">{formatDateTime(tx.valueDate ?? tx.transactionDate)}</td>
														<td className="px-4 py-2 font-mono text-gray-900">{tx.transactionNumber}</td>
														<td className="px-4 py-2 text-right font-medium">{formatAmount(tx.amount, tx.currency ?? loan.currency, locale)}</td>
														<td className="px-4 py-2 text-right">{formatAmount(meta?.penaltyAllocation ?? 0, tx.currency ?? loan.currency, locale)}</td>
														<td className="px-4 py-2 text-right">{formatAmount(meta?.interestPaid ?? 0, tx.currency ?? loan.currency, locale)}</td>
														<td className="px-4 py-2 text-right">{formatAmount(meta?.principalPaid ?? 0, tx.currency ?? loan.currency, locale)}</td>
														<td className="px-4 py-2">
															{meta?.sourceAccountId != null ? (
																<Link href={`/accounts/${meta.sourceAccountId}`} className="text-indigo-600 hover:text-indigo-800 hover:underline font-mono">
																	#{meta.sourceAccountId}
																</Link>
															) : (
																<span className="text-gray-400">—</span>
															)}
														</td>
														<td className="px-4 py-2 text-center">{getTransactionStatusBadge(tx.status)}</td>
														<td className="px-4 py-2 text-center">
															<Link
																href={`/transactions/${tx.id}`}
																className="inline-flex items-center justify-center rounded-md border h-8 px-3 text-sm hover:bg-gray-50 transition-colors"
															>
																{t("loan.detail.repayments.table.detail")}
															</Link>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{activeTab === "accountingEntries" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
									<svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
								</div>
								<div>
									<h2 className="text-lg font-semibold text-gray-900">{t("loan.detail.accountingEntries.title")}</h2>
									<p className="text-sm text-gray-500">{t("loan.detail.accountingEntries.subtitle")}</p>
								</div>
							</div>
							{accountingEntriesLoading ? (
								<div className="py-12 text-center text-gray-500">{t("loan.detail.accountingEntries.loading")}</div>
							) : accountingEntries.length === 0 ? (
								<div className="py-12 text-center text-gray-500 rounded-lg border border-dashed border-gray-200">
									{t("loan.detail.accountingEntries.empty")}
								</div>
							) : (
								<div className="overflow-x-auto rounded-lg border border-gray-200">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.accountingEntries.table.date")}</th>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.accountingEntries.table.source")}</th>
												<th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">{t("loan.detail.accountingEntries.table.type")}</th>
												<th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">{t("loan.detail.accountingEntries.table.amount")}</th>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.accountingEntries.table.glAccount")}</th>
												<th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{t("loan.detail.accountingEntries.table.reference")}</th>
												<th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">{t("loan.detail.accountingEntries.table.actions")}</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200 text-sm">
											{accountingEntries.map((entry) => (
												<tr key={`${entry.source}-${entry.id}`} className="hover:bg-gray-50">
													<td className="px-4 py-2 text-gray-600 whitespace-nowrap">
														{formatDate(entry.entryDate ?? entry.createdAt)}
													</td>
													<td className="px-4 py-2 whitespace-nowrap">
														<Badge className="bg-slate-100 text-slate-800">
															{t(`loan.detail.accountingEntries.source.${entry.source}`)}
														</Badge>
													</td>
													<td className="px-4 py-2 text-center">
														<Badge className={entry.entryType === "DEBIT" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
															{t(`transaction.detail.entryTypes.${entry.entryType}`)}
														</Badge>
													</td>
													<td className="px-4 py-2 text-right font-medium font-mono">
														{formatAmount(entry.amount, entry.currency, locale)}
													</td>
													<td className="px-4 py-2 font-mono text-gray-700">
														{entry.ledgerAccountCode ?? "—"}
													</td>
													<td className="px-4 py-2 text-gray-600">
														{entry.referenceType != null ? (
															<span className="font-mono text-xs">{entry.referenceType}</span>
														) : entry.transactionType != null ? (
															<span className="font-mono text-xs">{entry.transactionType}</span>
														) : (
															"—"
														)}
													</td>
													<td className="px-4 py-2 text-center">
														<Button
															variant="outline"
															size="sm"
															className="gap-1.5"
															onClick={() => setSelectedAccountingEntry(entry)}
														>
															<Eye className="h-4 w-4 shrink-0" aria-hidden />
															{t("loan.detail.accountingEntries.view")}
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{activeTab === "classification" && (
						<div className="space-y-6">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div className="flex items-center gap-2">
									<div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
										<svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
										</svg>
									</div>
									<div>
										<h2 className="text-lg font-semibold text-gray-900">{t("loan.detail.classification.title")}</h2>
										<p className="text-sm text-gray-500">{t("loan.detail.classification.subtitle")}</p>
									</div>
								</div>
								{canRequestRemission && (
									<Button
										onClick={() => {
											setRemissionTargetStage(remissionTargetOptions[remissionTargetOptions.length - 1] ?? "");
											setShowRemissionModal(true);
										}}
									>
										{t("loan.detail.classification.remission.requestButton")}
									</Button>
								)}
							</div>
							{classification == null ? (
								<div className="py-12 text-center text-gray-500 rounded-lg border border-dashed border-gray-200">
									{t("loan.detail.classification.empty")}
								</div>
							) : (
								<div className="overflow-x-auto rounded-lg border border-gray-200">
									<table className="min-w-full divide-y divide-gray-200 text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.table.stage")}</th>
												<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.table.pcemfCode")}</th>
												<th className="px-4 py-3 text-right font-medium text-gray-600">{t("loan.detail.classification.table.dpd")}</th>
												<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.table.stageSince")}</th>
												<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.table.doubtfulSince")}</th>
												<th className="px-4 py-3 text-right font-medium text-gray-600">{t("loan.detail.classification.table.provision")}</th>
												<th className="px-4 py-3 text-center font-medium text-gray-600">{t("loan.detail.classification.table.accrualSuspended")}</th>
												<th className="px-4 py-3 text-center font-medium text-gray-600">{t("loan.detail.classification.table.override")}</th>
												<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.table.updatedAt")}</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-100 bg-white">
											<tr className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap">{getClassificationStageBadge(classification.classificationStage)}</td>
												<td className="px-4 py-3 font-mono text-gray-900">{classification.pcemfLoanAccountCode}</td>
												<td className="px-4 py-3 text-right font-mono">{classification.dpdDays}</td>
												<td className="px-4 py-3">{formatDate(classification.stageSinceDate)}</td>
												<td className="px-4 py-3">{formatDate(classification.doubtfulSinceDate)}</td>
												<td className="px-4 py-3 text-right font-medium">
													{formatAmount(classification.provisionAmount, loan.currency, locale)}
												</td>
												<td className="px-4 py-3 text-center">
													{classification.interestAccrualSuspended
														? t("loan.detail.classification.yes")
														: t("loan.detail.classification.no")}
												</td>
												<td className="px-4 py-3 text-center">
													{classification.classificationOverride
														? t("loan.detail.classification.yes")
														: t("loan.detail.classification.no")}
												</td>
												<td className="px-4 py-3 text-gray-600">{formatDate(classification.updatedAt)}</td>
											</tr>
										</tbody>
									</table>
								</div>
							)}

							{pendingRemissionRequest != null && (
								<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
									<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
										<div>
											<p className="font-medium text-amber-900">{t("loan.detail.classification.remission.pendingTitle")}</p>
											<p className="text-sm text-amber-800 mt-1">
												{getClassificationStageBadge(pendingRemissionRequest.currentStage)}
												<span className="mx-2">→</span>
												{getClassificationStageBadge(pendingRemissionRequest.targetStage)}
											</p>
											<p className="text-sm text-amber-800 mt-2 whitespace-pre-wrap">{pendingRemissionRequest.reason}</p>
											<p className="text-xs text-amber-700 mt-2">
												{t("loan.detail.classification.remission.requestedAt", {
													date: formatDateTime(pendingRemissionRequest.requestedAt),
													user: pendingRemissionRequest.requestedBy ?? "—"
												})}
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											{canApprovePendingRemission && (
												<>
													<Button
														size="sm"
														onClick={() => handleApproveRemissionRequest(pendingRemissionRequest)}
														disabled={remissionDeciding}
													>
														{t("loan.detail.classification.remission.approveButton")}
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() => {
															setSelectedRemissionRequest(pendingRemissionRequest);
															setShowRejectRemissionModal(true);
														}}
														disabled={remissionDeciding}
													>
														{t("loan.detail.classification.remission.rejectButton")}
													</Button>
												</>
											)}
											{canCancelPendingRemission && (
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleCancelRemissionRequest(pendingRemissionRequest)}
													disabled={remissionDeciding}
												>
													{t("loan.detail.classification.remission.cancelButton")}
												</Button>
											)}
										</div>
									</div>
									{!canApprovePendingRemission && pendingRemissionRequest.requestedBy === currentUserId && (
										<p className="text-xs text-amber-700">{t("loan.detail.classification.remission.makerHint")}</p>
									)}
								</div>
							)}

							<div className="space-y-3">
								<h3 className="text-base font-semibold text-gray-900">{t("loan.detail.classification.remission.historyTitle")}</h3>
								{remissionRequestsLoading ? (
									<p className="text-sm text-gray-500">{t("loan.detail.classification.remission.loading")}</p>
								) : remissionRequests.length === 0 ? (
									<p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-200 py-8 text-center">
										{t("loan.detail.classification.remission.empty")}
									</p>
								) : (
									<div className="overflow-x-auto rounded-lg border border-gray-200">
										<table className="min-w-full divide-y divide-gray-200 text-sm">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.remission.table.date")}</th>
													<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.remission.table.transition")}</th>
													<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.remission.table.status")}</th>
													<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.remission.table.reason")}</th>
													<th className="px-4 py-3 text-left font-medium text-gray-600">{t("loan.detail.classification.remission.table.actors")}</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-100 bg-white">
												{remissionRequests.map((req) => (
													<tr key={req.id} className="hover:bg-gray-50 align-top">
														<td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDateTime(req.requestedAt)}</td>
														<td className="px-4 py-3 whitespace-nowrap">
															{getClassificationStageBadge(req.currentStage)}
															<span className="mx-1">→</span>
															{getClassificationStageBadge(req.targetStage)}
														</td>
														<td className="px-4 py-3">{getRemissionStatusBadge(req.status)}</td>
														<td className="px-4 py-3 max-w-xs">
															<p className="line-clamp-3">{req.reason}</p>
															{req.decisionComment && (
																<p className="text-xs text-gray-500 mt-1">{req.decisionComment}</p>
															)}
														</td>
														<td className="px-4 py-3 text-gray-600 text-xs">
															<div>#{req.requestedBy ?? "—"}</div>
															{req.decidedBy != null && <div>→ #{req.decidedBy}</div>}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Modal détail écriture comptable */}
			{selectedAccountingEntry != null && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
					onClick={() => setSelectedAccountingEntry(null)}
				>
					<div
						className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-lg font-semibold text-gray-900">{t("loan.detail.accountingEntries.modal.title")}</h3>
								<p className="text-sm text-gray-500 mt-1">
									{t(`loan.detail.accountingEntries.source.${selectedAccountingEntry.source}`)} · #{selectedAccountingEntry.id}
								</p>
							</div>
							<button
								type="button"
								className="text-gray-400 hover:text-gray-600 text-xl leading-none"
								onClick={() => setSelectedAccountingEntry(null)}
								aria-label={t("loan.detail.accountingEntries.modal.close")}
							>
								×
							</button>
						</div>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
							<div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
								<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.table.date")}</dt>
								<dd className="font-medium text-gray-900">
									{formatDate(selectedAccountingEntry.entryDate ?? selectedAccountingEntry.createdAt)}
								</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
								<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.modal.createdAt")}</dt>
								<dd className="font-medium text-gray-900">{formatDateTime(selectedAccountingEntry.createdAt)}</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
								<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.table.type")}</dt>
								<dd>
									<Badge className={selectedAccountingEntry.entryType === "DEBIT" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
										{t(`transaction.detail.entryTypes.${selectedAccountingEntry.entryType}`)}
									</Badge>
								</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
								<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.table.amount")}</dt>
								<dd className="font-mono font-semibold text-gray-900">
									{formatAmount(selectedAccountingEntry.amount, selectedAccountingEntry.currency, locale)}
								</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
								<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.table.glAccount")}</dt>
								<dd className="font-mono text-gray-900">{selectedAccountingEntry.ledgerAccountCode ?? "—"}</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
								<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.table.reference")}</dt>
								<dd className="font-mono text-gray-900">
									{selectedAccountingEntry.referenceType ?? selectedAccountingEntry.transactionType ?? "—"}
									{selectedAccountingEntry.referenceId != null && (
										<span className="text-gray-500"> · #{selectedAccountingEntry.referenceId}</span>
									)}
								</dd>
							</div>
							{selectedAccountingEntry.transactionId != null && (
								<div className="bg-gray-50 rounded-lg p-3 border border-gray-100 sm:col-span-2">
									<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.modal.transaction")}</dt>
									<dd>
										<Link
											href={`/transactions/${selectedAccountingEntry.transactionId}`}
											className="text-indigo-600 hover:text-indigo-800 hover:underline font-mono"
										>
											{selectedAccountingEntry.transactionNumber ?? `#${selectedAccountingEntry.transactionId}`}
										</Link>
									</dd>
								</div>
							)}
							<div className="bg-gray-50 rounded-lg p-3 border border-gray-100 sm:col-span-2">
								<dt className="text-gray-500 mb-1">{t("loan.detail.accountingEntries.modal.description")}</dt>
								<dd className="text-gray-900 whitespace-pre-wrap break-words">
									{selectedAccountingEntry.description ?? "—"}
								</dd>
							</div>
						</dl>
						<div className="flex justify-end pt-2">
							<Button variant="outline" onClick={() => setSelectedAccountingEntry(null)}>
								{t("loan.detail.accountingEntries.modal.close")}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Remboursement */}
			{showRepayModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !repayLoading && setShowRepayModal(false)}>
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
						<h3 className="text-lg font-semibold text-gray-900">{t("loan.detail.repayModalTitle")}</h3>
						<p className="text-sm text-gray-600">{t("loan.detail.repayModalDesc")}</p>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.detail.repaySourceAccount")}</label>
							{loadingRepayAccounts ? (
								<p className="text-sm text-gray-500">{t("loan.detail.loading")}</p>
							) : repayAccounts.length === 0 ? (
								<p className="text-sm text-amber-700">{t("loan.detail.disburseNoAccounts")}</p>
							) : (
								<select
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
									value={repaySourceAccountId}
									onChange={(e) => setRepaySourceAccountId(e.target.value === "" ? "" : Number(e.target.value))}
								>
									<option value="">{t("loan.detail.repaySelectAccount")}</option>
									{repayAccounts.map((acc) => (
										<option key={acc.id} value={acc.id}>
											{acc.accountNumber} — {acc.product?.name ?? acc.id} ({formatAmount(acc.balance, acc.currency, locale)})
										</option>
									))}
								</select>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.detail.repayAmount")}</label>
							<input
								type="number"
								min="0.01"
								step="0.01"
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								placeholder="0.00"
								value={repayAmount}
								onChange={(e) => setRepayAmount(e.target.value)}
							/>
							{loan?.currency && (
								<p className="text-xs text-gray-500 mt-1">{loan.currency}</p>
							)}
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => !repayLoading && setShowRepayModal(false)} disabled={repayLoading}>
								{t("loan.apply.cancel")}
							</Button>
							<Button
								onClick={handleRepay}
								disabled={
									repayLoading ||
									repaySourceAccountId === "" ||
									!repayAmount ||
									repayAccounts.length === 0 ||
									Number(repayAmount) <= 0
								}
							>
								{repayLoading ? t("loan.detail.repayLoading") : t("loan.detail.repayConfirm")}
							</Button>
						</div>
					</div>
				</div>
			)}

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
			{showRemissionModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
					onClick={() => !remissionSubmitting && setShowRemissionModal(false)}
				>
					<div
						className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-lg font-semibold text-gray-900">{t("loan.detail.classification.remission.modalTitle")}</h3>
						<p className="text-sm text-gray-500">{t("loan.detail.classification.remission.modalHint")}</p>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{t("loan.detail.classification.remission.targetStageLabel")}
							</label>
							<select
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
								value={remissionTargetStage}
								onChange={(e) => setRemissionTargetStage(e.target.value as LoanClassificationStage)}
							>
								{remissionTargetOptions.map((stage) => (
									<option key={stage} value={stage}>
										{t(`loan.detail.classification.stage.${stage}`)}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{t("loan.detail.classification.remission.reasonLabel")}
							</label>
							<textarea
								className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[120px]"
								value={remissionReason}
								onChange={(e) => setRemissionReason(e.target.value)}
								placeholder={t("loan.detail.classification.remission.reasonPlaceholder")}
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setShowRemissionModal(false)} disabled={remissionSubmitting}>
								{t("loan.apply.cancel")}
							</Button>
							<Button onClick={handleSubmitRemissionRequest} disabled={remissionSubmitting || remissionTargetStage === ""}>
								{remissionSubmitting ? t("loan.detail.classification.remission.submitting") : t("loan.detail.classification.remission.submitButton")}
							</Button>
						</div>
					</div>
				</div>
			)}
			{showRejectRemissionModal && selectedRemissionRequest != null && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
					onClick={() => !remissionDeciding && setShowRejectRemissionModal(false)}
				>
					<div
						className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-lg font-semibold text-gray-900">{t("loan.detail.classification.remission.rejectModalTitle")}</h3>
						<textarea
							className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[100px]"
							value={rejectRemissionReason}
							onChange={(e) => setRejectRemissionReason(e.target.value)}
							placeholder={t("loan.detail.classification.remission.rejectReasonPlaceholder")}
						/>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setShowRejectRemissionModal(false)} disabled={remissionDeciding}>
								{t("loan.apply.cancel")}
							</Button>
							<Button onClick={handleRejectRemissionRequest} disabled={remissionDeciding}>
								{remissionDeciding ? t("loan.detail.classification.remission.rejecting") : t("loan.detail.classification.remission.rejectConfirm")}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
