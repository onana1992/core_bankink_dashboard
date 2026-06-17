import type { Account } from "./account";
import type { Customer } from "./customer";
import type { Product, ProductFee, ProductPeriod } from "./product";

export type LoanScheduleStatus = "PENDING" | "PAID" | "OVERDUE" | "PARTIAL";

export interface LoanScheduleItem {
	id: number;
	accountId: number;
	installmentNumber: number;
	dueDate: string;
	principalAmount: number;
	interestAmount: number;
	totalAmount: number;
	outstandingPrincipal: number;
	paidPrincipal: number;
	paidInterest: number;
	status: LoanScheduleStatus;
	paidAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface LoanSimulationResult {
	principal: number;
	annualRatePercent: number;
	months: number;
	monthlyPayment: number;
	totalPayment: number;
	totalInterest: number;
}

/** Contexte affiché avec le résultat de simulation catalogue. */
export interface LoanSimulationPreview {
	productId: number;
	productName: string;
	productCode: string;
	currency: string;
	periodId: number;
	periodName: string;
	periodMonths: number;
	annualRatePercent: number;
	estimatedOpeningFee: number | null;
}

export interface DisburseRequest {
	targetAccountId: number;
}

export interface RepayLoanRequest {
	sourceAccountId: number;
	amount: number;
}

export interface LoanRepaymentAllocationItem {
	installmentNumber: number;
	dueDate: string;
	principalPaid: number;
	interestPaid: number;
}

/** Champs extraits du metadata d'une transaction LOAN_REPAYMENT sur le compte prêt. */
export interface LoanRepaymentMetadata {
	sourceAccountId: number | null;
	penaltyAllocation: number;
	principalPaid: number;
	interestPaid: number;
}

export interface LoanRepaymentResult {
	fromTransaction: { id: number; amount: number; [key: string]: unknown };
	loanTransaction: { id: number; amount: number; [key: string]: unknown };
	/** Montant du paiement affecté aux pénalités (priorité avant échéancier). */
	penaltyAllocation: number;
	allocations: LoanRepaymentAllocationItem[];
}

/** Détail du solde prêt : reste échéancier + pénalités + CRD + intérêts + total (calcul côté serveur). */
export interface LoanBalanceBreakdown {
	scheduleRemaining: number;
	penaltyBalance: number;
	capitalRemaining: number;
	interestRemaining: number;
	totalDue: number;
}

export type LoanAccountingEntrySource = "TRANSACTION_ENTRY" | "LEDGER_ENTRY";

/** Écriture comptable liée au compte prêt (transaction ou Grand Livre). */
export interface LoanAccountAccountingEntry {
	id: number;
	source: LoanAccountingEntrySource;
	transactionId?: number | null;
	transactionNumber?: string | null;
	transactionType?: string | null;
	referenceType?: string | null;
	referenceId?: number | null;
	entryType: "DEBIT" | "CREDIT";
	amount: number;
	currency: string;
	ledgerAccountCode?: string | null;
	description?: string | null;
	entryDate?: string | null;
	createdAt: string;
}

export type LoanClassificationStage = "PERFORMING" | "UNPAID" | "NON_PERFORMING" | "DOUBTFUL";

/** Ordre croissant de sévérité prudentielle (index 0 = moins sévère). */
export const LOAN_CLASSIFICATION_STAGE_ORDER: readonly LoanClassificationStage[] = [
	"PERFORMING",
	"UNPAID",
	"NON_PERFORMING",
	"DOUBTFUL"
] as const;

export type LoanStageRemissionRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** Demande de rémission manuelle de stade (CU-L17, maker-checker). */
export interface LoanStageRemissionRequest {
	id: number;
	accountId: number;
	currentStage: LoanClassificationStage;
	targetStage: LoanClassificationStage;
	reason: string;
	status: LoanStageRemissionRequestStatus;
	requestedAt: string;
	requestedBy?: number | null;
	decidedAt?: string | null;
	decidedBy?: number | null;
	decisionComment?: string | null;
	effectiveDate?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateLoanStageRemissionRequest {
	targetStage: LoanClassificationStage;
	reason: string;
}

export interface ApproveLoanStageRemissionRequest {
	comment?: string;
}

export interface RejectLoanStageRemissionRequest {
	reason: string;
}

/** Classification prudentielle PCEMF — une ligne par compte prêt (état actuel). */
export interface LoanCreditClassification {
	id: number;
	accountId: number;
	classificationStage: LoanClassificationStage;
	pcemfLoanAccountCode: string;
	dpdDays: number;
	stageSinceDate: string;
	doubtfulSinceDate?: string | null;
	provisionAmount: number;
	interestAccrualSuspended: boolean;
	classificationOverride: boolean;
	createdAt?: string;
	updatedAt?: string;
}

// UC-L07 / UC-L08 : Demandes de prêt (workflow)
export type LoanApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LoanApplication {
	id: number;
	applicationNumber: string;
	clientId: number;
	productId: number;
	periodId: number;
	requestedAmount: number;
	currency: string;
	sourceAccountId?: number | null;
	status: LoanApplicationStatus;
	requestedAt: string;
	requestedBy?: number | null;
	decidedAt?: string | null;
	decidedBy?: number | null;
	rejectionReason?: string | null;
	accountId?: number | null;
	createdAt?: string;
	updatedAt?: string;
	client?: {
		id: number;
		displayName: string;
		email?: string | null;
		phone?: string | null;
		status?: string;
		riskScore?: number | null;
	};
	product?: {
		id: number;
		code: string;
		name: string;
		category: string;
		currency?: string;
		description?: string | null;
		minBalance?: number | null;
		maxBalance?: number | null;
		defaultInterestRate?: number | null;
	};
	period?: {
		id: number;
		periodName: string;
		periodDays?: number;
		periodMonths?: number | null;
		periodYears?: number | null;
		interestRate?: number | null;
		minAmount?: number | null;
		maxAmount?: number | null;
	};
	account?: {
		id: number;
		accountNumber: string;
		status?: string;
		balance?: number;
		interestRate?: number | null;
		disbursedAt?: string | null;
		maturityDate?: string | null;
	};
}

export interface LoanApplicationDetailContext {
	customer?: Customer | null;
	product?: Product | null;
	period?: ProductPeriod | null;
	sourceAccount?: Account | null;
	openingFee?: ProductFee | null;
	simulation?: LoanSimulationResult | null;
	estimatedOpeningFeeAmount?: number | null;
	estimatedAnnualRate?: number | null;
}

export interface SubmitLoanApplicationRequest {
	clientId: number;
	productId: number;
	openingAmount: number;
	periodId: number;
	currency?: string;
	sourceAccountId?: number;
}

export interface DecideLoanApplicationRequest {
	approved: boolean;
	rejectionReason?: string;
}
