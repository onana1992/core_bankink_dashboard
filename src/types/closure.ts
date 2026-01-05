export type ClosureType = "DAILY" | "MONTHLY" | "YEARLY";
export type ClosureStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

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


