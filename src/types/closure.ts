export type ClosureType = "DAILY" | "MONTHLY" | "YEARLY";
export type ClosureStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type YearEndResultType = "PROFIT" | "LOSS" | "NEUTRE";

export interface Closure {
	id: number;
	closureDate: string;
	closureType: ClosureType;
	status: ClosureStatus;
	totalDebit: number;
	totalCredit: number;
	balanceCheck: boolean;
	description?: string | null;
	errorMessage?: string | null;
	createdAt: string;
	completedAt?: string | null;
	createdBy?: number | null;
	fiscalYear?: number | null;
	netResult?: number | null;
	resultType?: YearEndResultType | null;
	journalBatchId?: number | null;
}

export interface CloseDayRequest {
	date: string;
	description?: string;
}

export interface CloseMonthRequest {
	year: number;
	month: number;
	description?: string;
}

export interface CloseYearRequest {
	year: number;
	description?: string;
}

export interface YearEndClosingLine {
	ledgerAccountId: number;
	ledgerAccountCode: string;
	pcemfCode: string;
	accountType: string;
	closingAmount: number;
}

export interface YearEndProposedEntry {
	ledgerAccountCode: string;
	pcemfCode: string;
	debitAmount: number;
	creditAmount: number;
	description: string;
}

export interface YearEndClosingPreview {
	year: number;
	asOfDate: string;
	totalCharges: number;
	totalRevenues: number;
	netResult: number;
	resultType: YearEndResultType;
	chargeLines: YearEndClosingLine[];
	revenueLines: YearEndClosingLine[];
	proposedEntries: YearEndProposedEntry[];
	warnings: string[];
}

export interface ClosureValidationResponse {
	isValid: boolean;
	balanceCheck: boolean;
	totalDebit: number;
	totalCredit: number;
	difference: number;
	errors: string[];
	warnings: string[];
	message: string;
}

export type ClosureRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ClosureRequest {
	id: number;
	closureType: ClosureType;
	closureDate: string;
	closureYear?: number | null;
	closureMonth?: number | null;
	description?: string | null;
	status: ClosureRequestStatus;
	requestedAt: string;
	requestedBy?: number | null;
	decidedAt?: string | null;
	decidedBy?: number | null;
	decisionComment?: string | null;
	closureId?: number | null;
}

export interface AccountingCalendarStatus {
	zoneId: string;
	cutoffTime: string;
	calendarDate: string;
	businessDate: string;
	dateForDailyClosure: string;
	dailyClosureJobEnabled: boolean;
	monthForMonthlyClosureYear?: number | null;
	monthForMonthlyClosureMonth?: number | null;
	monthlyClosureJobEnabled: boolean;
	yearForAnnualClosure?: number | null;
	annualClosureJobEnabled: boolean;
}

export interface ApproveClosureRequest {
	comment?: string;
}

export interface RejectClosureRequest {
	reason: string;
}

export type CloseDayResult =
	| { kind: "executed"; closure: Closure }
	| { kind: "submitted"; request: ClosureRequest };

export type CloseMonthResult =
	| { kind: "executed"; closure: Closure }
	| { kind: "submitted"; request: ClosureRequest };

export type CloseYearResult =
	| { kind: "executed"; closure: Closure }
	| { kind: "submitted"; request: ClosureRequest };

export interface YearEndClosingDetail {
	closureId: number;
	fiscalYear: number;
	netResult?: number | null;
	resultType?: YearEndResultType | null;
	journalBatchId?: number | null;
	journalBatchNumber?: string | null;
	totalCharges?: number | null;
	totalRevenues?: number | null;
	entries: Array<{
		ledgerAccountCode: string;
		pcemfCode: string;
		debitAmount: number;
		creditAmount: number;
		description: string;
	}>;
}

