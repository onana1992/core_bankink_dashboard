export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type LedgerAccountStatus = "ACTIVE" | "INACTIVE";
export type MappingType = 
	"ASSET_ACCOUNT" | 
	"LIABILITY_ACCOUNT" | 
	"FEE_ACCOUNT" | 
	"INTEREST_ACCOUNT" | 
	"REVENUE_ACCOUNT" | 
	"EXPENSE_ACCOUNT";

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

export interface ProductGLMapping {
	id: number;
	productId: number;
	mappingType: MappingType;
	ledgerAccountId: number;
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

export interface CreateProductGLMappingRequest {
	mappingType: MappingType;
	ledgerAccountId: number;
}

export interface UpdateProductGLMappingRequest {
	mappingType?: MappingType;
	ledgerAccountId?: number;
}

