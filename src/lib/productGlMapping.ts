import type { AccountType, MappingType, ProductCategory } from "@/types";

export const DEPOSIT_GL_MAPPING_TYPES: MappingType[] = [
	"LIABILITY_ACCOUNT",
	"INTEREST_ACCOUNT",
	"FEE_ACCOUNT",
	"REVENUE_ACCOUNT",
	"EXPENSE_ACCOUNT"
];

export const LOAN_GL_MAPPING_TYPES: MappingType[] = [
	"ASSET_ACCOUNT",
	"INTEREST_ACCOUNT",
	"FEE_ACCOUNT",
	"NPL_UNPAID_ACCOUNT",
	"NPL_IMMOBILIZED_ACCOUNT",
	"NPL_DOUBTFUL_ACCOUNT",
	"LOAN_ACCRUAL_ACCOUNT",
	"PROVISION_CHARGE_ACCOUNT",
	"PROVISION_RELEASE_ACCOUNT",
	"PROV_DOUBTFUL_LT1Y_ACCOUNT",
	"PROV_DOUBTFUL_1T2Y_ACCOUNT",
	"PROV_DOUBTFUL_GT2Y_ACCOUNT",
	"WRITEOFF_ACCOUNT"
];

export const LOAN_REQUIRED_GL_MAPPING_TYPES: MappingType[] = [...LOAN_GL_MAPPING_TYPES];

const ACCOUNT_TYPES_BY_MAPPING: Record<MappingType, AccountType[]> = {
	ASSET_ACCOUNT: ["ASSET"],
	LIABILITY_ACCOUNT: ["LIABILITY"],
	FEE_ACCOUNT: ["EXPENSE", "REVENUE"],
	INTEREST_ACCOUNT: ["EXPENSE", "REVENUE"],
	REVENUE_ACCOUNT: ["REVENUE"],
	EXPENSE_ACCOUNT: ["EXPENSE"],
	NPL_UNPAID_ACCOUNT: ["ASSET"],
	NPL_IMMOBILIZED_ACCOUNT: ["ASSET"],
	NPL_DOUBTFUL_ACCOUNT: ["ASSET"],
	LOAN_ACCRUAL_ACCOUNT: ["ASSET"],
	PROVISION_CHARGE_ACCOUNT: ["EXPENSE"],
	PROVISION_RELEASE_ACCOUNT: ["REVENUE"],
	PROV_DOUBTFUL_LT1Y_ACCOUNT: ["LIABILITY"],
	PROV_DOUBTFUL_1T2Y_ACCOUNT: ["LIABILITY"],
	PROV_DOUBTFUL_GT2Y_ACCOUNT: ["LIABILITY"],
	WRITEOFF_ACCOUNT: ["EXPENSE"]
};

export function getGlMappingTypesForCategory(category?: ProductCategory): MappingType[] {
	if (category === "LOAN") {
		return LOAN_GL_MAPPING_TYPES;
	}
	return DEPOSIT_GL_MAPPING_TYPES;
}

export function getRequiredGlMappingTypesForCategory(category?: ProductCategory): MappingType[] {
	if (category === "LOAN") {
		return LOAN_REQUIRED_GL_MAPPING_TYPES;
	}
	if (category === "CURRENT_ACCOUNT" || category === "SAVINGS_ACCOUNT" || category === "TERM_DEPOSIT") {
		return ["LIABILITY_ACCOUNT", "INTEREST_ACCOUNT", "FEE_ACCOUNT"];
	}
	return [];
}

export function getDefaultGlMappingType(category?: ProductCategory): MappingType {
	return category === "LOAN" ? "ASSET_ACCOUNT" : "LIABILITY_ACCOUNT";
}

export function getAllowedAccountTypesForMapping(mappingType: MappingType): AccountType[] {
	return ACCOUNT_TYPES_BY_MAPPING[mappingType] ?? [];
}
