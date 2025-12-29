export type AccountStatus = "ACTIVE" | "CLOSED" | "FROZEN" | "SUSPENDED";

export interface Account {
	id: number;
	clientId?: number;
	productId?: number;
	accountNumber: string;
	status: AccountStatus;
	currency: string;
	balance: number;
	availableBalance: number;
	openingAmount?: number | null;
	interestRate?: number | null;
	periodId?: number | null;
	maturityDate?: string | null;
	openedAt?: string;
	closedAt?: string | null;
	closedReason?: string | null;
	openedBy?: number | null;
	createdAt?: string;
	updatedAt?: string;
	// Relations chargées optionnellement
	client?: {
		id: number;
		displayName: string;
		email?: string | null;
	};
	product?: {
		id: number;
		code: string;
		name: string;
		category: string;
	};
}

export interface OpenProductRequest {
	productId: number;
	openingAmount?: number;
	periodId?: number;
	currency?: string;
	sourceAccountId?: number; // Compte source pour les frais d'ouverture (optionnel)
}

export interface CloseAccountRequest {
	reason: string;
}

export interface FreezeAccountRequest {
	reason?: string;
}

export interface SuspendAccountRequest {
	reason?: string;
}

