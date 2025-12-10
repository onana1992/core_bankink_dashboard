export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "FEE" | "INTEREST" | "ADJUSTMENT" | "REVERSAL";
export type TransactionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REVERSED";
export type EntryType = "DEBIT" | "CREDIT";
export type HoldStatus = "PENDING" | "RELEASED" | "APPLIED" | "EXPIRED";

export interface Transaction {
	id: number;
	transactionNumber: string;
	type: TransactionType;
	status: TransactionStatus;
	amount: number;
	currency: string;
	accountId: number;
	referenceType?: string | null;
	referenceId?: number | null;
	description?: string | null;
	metadata?: string | null;
	valueDate: string;
	transactionDate: string;
	createdBy?: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface TransactionEntry {
	id: number;
	transactionId: number;
	ledgerAccountId?: number | null;
	entryType: EntryType;
	amount: number;
	currency: string;
	createdAt: string;
}

export interface Hold {
	id: number;
	accountId: number;
	amount: number;
	currency: string;
	reason: string;
	status: HoldStatus;
	expiresAt?: string | null;
	transactionId?: number | null;
	createdAt: string;
	releasedAt?: string | null;
}

export interface CreateTransactionRequest {
	type: TransactionType;
	accountId: number;
	amount: number;
	currency?: string;
	referenceType?: string;
	referenceId?: number;
	description?: string;
	metadata?: string;
	valueDate?: string;
}

export interface ReverseTransactionRequest {
	reason: string;
}

export interface CreateHoldRequest {
	amount: number;
	currency?: string;
	reason: string;
	expiresAt?: string;
}




