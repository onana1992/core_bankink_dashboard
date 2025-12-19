export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type LedgerAccountStatus = "ACTIVE" | "INACTIVE";

export interface ChartOfAccount {
	id: number;
	code: string;
	name: string;
	description?: string | null;
	accountType: AccountType;
	category?: string | null;
	parentCode?: string | null;
	level: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	createdBy?: number | null;
}

export interface CreateChartOfAccountRequest {
	code: string;
	name: string;
	description?: string;
	accountType: AccountType;
	category?: string;
	parentCode?: string;
	level?: number;
	isActive?: boolean;
}

export interface UpdateChartOfAccountRequest {
	name?: string;
	description?: string;
	accountType?: AccountType;
	category?: string;
	parentCode?: string;
	level?: number;
	isActive?: boolean;
}

export interface LedgerAccount {
	id: number;
	code: string;
	name: string;
	chartOfAccountCode: string;
	accountType: AccountType;
	currency: string;
	status: LedgerAccountStatus;
	balance: number;
	availableBalance: number;
	createdAt: string;
	updatedAt: string;
	createdBy?: number | null;
}

export interface CreateLedgerAccountRequest {
	code: string;
	name: string;
	chartOfAccountCode: string;
	accountType: AccountType;
	currency: string;
	status?: LedgerAccountStatus;
}

export interface UpdateLedgerAccountRequest {
	name?: string;
	accountType?: AccountType;
	currency?: string;
	status?: LedgerAccountStatus;
}

// Journal Batches
export type JournalBatchStatus = "DRAFT" | "POSTED" | "CLOSED";

export interface JournalBatch {
	id: number;
	batchNumber: string;
	batchDate: string;
	description?: string | null;
	status: JournalBatchStatus;
	totalDebit: number;
	totalCredit: number;
	currency: string;
	createdAt: string;
	updatedAt: string;
	createdBy?: number | null;
	entries?: LedgerEntry[];
}

export interface CreateJournalBatchRequest {
	batchNumber: string;
	batchDate: string;
	description?: string;
}

export interface LedgerEntry {
	id: number;
	ledgerAccountId: number;
	ledgerAccountCode?: string;
	entryDate: string;
	valueDate: string;
	entryType: "DEBIT" | "CREDIT";
	amount: number;
	currency: string;
	description?: string | null;
	referenceType?: string | null;
	referenceId?: number | null;
	journalBatchId?: number | null;
	createdAt: string;
	updatedAt: string;
	createdBy?: number | null;
}
