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
	client?: { id: number; displayName: string; email?: string | null };
	product?: { id: number; code: string; name: string; category: string };
	period?: { id: number; periodName: string; periodMonths?: number };
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
