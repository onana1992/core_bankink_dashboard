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

export interface LoanRepaymentResult {
	fromTransaction: { id: number; amount: number; [key: string]: unknown };
	loanTransaction: { id: number; amount: number; [key: string]: unknown };
	/** Montant du paiement affecté aux pénalités (priorité avant échéancier). */
	penaltyAllocation: number;
	allocations: LoanRepaymentAllocationItem[];
}

/** Détail du solde prêt : reste échéancier + pénalités (calcul côté serveur). */
export interface LoanBalanceBreakdown {
	scheduleRemaining: number;
	penaltyBalance: number;
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
