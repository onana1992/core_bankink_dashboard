export interface BalanceSnapshot {
	id: number;
	ledgerAccountId: number;
	ledgerAccountCode: string | null;
	ledgerAccountName: string | null;
	snapshotDate: string;
	currency: string;
	openingBalance: number;
	closingBalance: number;
	totalDebit: number;
	totalCredit: number;
	createdAt: string;
}
