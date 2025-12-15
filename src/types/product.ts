import type { TransactionType } from './transaction';

export type ProductCategory = "CURRENT_ACCOUNT" | "SAVINGS_ACCOUNT" | "TERM_DEPOSIT" | "LOAN" | "CARD";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export interface Product {
	id: number;
	code: string;
	name: string;
	description?: string | null;
	category: ProductCategory;
	status: ProductStatus;
	currency: string;
	minBalance?: number | null;
	maxBalance?: number | null;
	defaultInterestRate?: number | null;
	createdAt?: string;
	updatedAt?: string;
	createdBy?: number | null;
}

export interface CreateProductRequest {
	code: string;
	name: string;
	description?: string;
	category: ProductCategory;
	currency?: string;
	minBalance?: number;
	maxBalance?: number;
	defaultInterestRate?: number;
}

export interface UpdateProductRequest {
	name?: string;
	description?: string;
	status?: ProductStatus;
	currency?: string;
	minBalance?: number;
	maxBalance?: number;
	defaultInterestRate?: number;
}

// Interest Rates
export type RateType = "DEPOSIT" | "LENDING" | "PENALTY";
export type CalculationMethod = "SIMPLE" | "COMPOUND" | "FLOATING";
export type CompoundingFrequency = "DAILY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface ProductInterestRate {
	id: number;
	productId: number;
	rateType: RateType;
	rateValue: number;
	minAmount?: number | null;
	maxAmount?: number | null;
	minPeriodDays?: number | null;
	maxPeriodDays?: number | null;
	calculationMethod: CalculationMethod;
	compoundingFrequency?: CompoundingFrequency | null;
	effectiveFrom: string;
	effectiveTo?: string | null;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateProductInterestRateRequest {
	rateType: RateType;
	rateValue: number;
	minAmount?: number;
	maxAmount?: number;
	minPeriodDays?: number;
	maxPeriodDays?: number;
	calculationMethod: CalculationMethod;
	compoundingFrequency?: CompoundingFrequency;
	effectiveFrom: string;
	effectiveTo?: string;
	isActive?: boolean;
}

// Fees
export type FeeType = "OPENING" | "MONTHLY" | "ANNUAL" | "TRANSACTION" | "WITHDRAWAL" | "OVERDRAFT" | "LATE_PAYMENT" | "EARLY_WITHDRAWAL" | "CARD_ISSUANCE" | "CARD_RENEWAL" | "OTHER";
export type FeeCalculationBase = "FIXED" | "BALANCE" | "TRANSACTION_AMOUNT" | "OUTSTANDING_BALANCE";

export interface ProductFee {
	id: number;
	productId: number;
	feeType: FeeType;
	transactionType?: TransactionType | null; // Optionnel : pour associer un frais TRANSACTION à un type de transaction spécifique
	feeName: string;
	feeAmount?: number | null;
	feePercentage?: number | null;
	feeCalculationBase: FeeCalculationBase;
	minFee?: number | null;
	maxFee?: number | null;
	currency: string;
	isWaivable: boolean;
	effectiveFrom: string;
	effectiveTo?: string | null;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateProductFeeRequest {
	feeType: FeeType;
	transactionType?: TransactionType | null; // Optionnel : pour associer un frais TRANSACTION à un type de transaction spécifique
	feeName: string;
	feeAmount?: number;
	feePercentage?: number;
	feeCalculationBase: FeeCalculationBase;
	minFee?: number;
	maxFee?: number;
	currency?: string;
	isWaivable?: boolean;
	effectiveFrom: string;
	effectiveTo?: string;
	isActive?: boolean;
}

// Limits
export type LimitType = "MIN_BALANCE" | "MAX_BALANCE" | "MIN_TRANSACTION" | "MAX_TRANSACTION" | "DAILY_LIMIT" | "MONTHLY_LIMIT" | "ANNUAL_LIMIT" | "MIN_LOAN_AMOUNT" | "MAX_LOAN_AMOUNT" | "MIN_DEPOSIT_AMOUNT" | "MAX_DEPOSIT_AMOUNT" | "CARD_LIMIT" | "WITHDRAWAL_LIMIT";
export type PeriodType = "TRANSACTION" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL" | "LIFETIME";

export interface ProductLimit {
	id: number;
	productId: number;
	limitType: LimitType;
	limitValue: number;
	currency: string;
	periodType?: PeriodType | null;
	effectiveFrom: string;
	effectiveTo?: string | null;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateProductLimitRequest {
	limitType: LimitType;
	limitValue: number;
	currency?: string;
	periodType?: PeriodType;
	effectiveFrom: string;
	effectiveTo?: string;
	isActive?: boolean;
}

// Periods
export interface ProductPeriod {
	id: number;
	productId: number;
	periodName: string;
	periodDays: number;
	periodMonths?: number | null;
	periodYears?: number | null;
	interestRate?: number | null;
	minAmount?: number | null;
	maxAmount?: number | null;
	isActive: boolean;
	displayOrder: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateProductPeriodRequest {
	periodName: string;
	periodDays: number;
	periodMonths?: number;
	periodYears?: number;
	interestRate?: number;
	minAmount?: number;
	maxAmount?: number;
	isActive?: boolean;
	displayOrder?: number;
}

// Penalties
export type PenaltyType = "EARLY_WITHDRAWAL" | "OVERDRAFT" | "LATE_PAYMENT" | "MIN_BALANCE_VIOLATION" | "EXCESS_TRANSACTION" | "PREPAYMENT" | "OTHER";
export type PenaltyCalculationBase = "FIXED" | "PRINCIPAL" | "INTEREST" | "BALANCE" | "TRANSACTION_AMOUNT";

export interface ProductPenalty {
	id: number;
	productId: number;
	penaltyType: PenaltyType;
	penaltyName: string;
	penaltyAmount?: number | null;
	penaltyPercentage?: number | null;
	calculationBase: PenaltyCalculationBase;
	minPenalty?: number | null;
	maxPenalty?: number | null;
	currency: string;
	gracePeriodDays?: number | null;
	effectiveFrom: string;
	effectiveTo?: string | null;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateProductPenaltyRequest {
	penaltyType: PenaltyType;
	penaltyName: string;
	penaltyAmount?: number;
	penaltyPercentage?: number;
	calculationBase: PenaltyCalculationBase;
	minPenalty?: number;
	maxPenalty?: number;
	currency?: string;
	gracePeriodDays?: number;
	effectiveFrom: string;
	effectiveTo?: string;
	isActive?: boolean;
}

// Eligibility Rules
export type EligibilityRuleType = "MIN_AGE" | "MAX_AGE" | "MIN_INCOME" | "MIN_BALANCE" | "CLIENT_TYPE" | "CLIENT_STATUS" | "RESIDENCY" | "KYC_LEVEL" | "RISK_SCORE" | "PEP_FLAG" | "OTHER";
export type EligibilityOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN" | "LESS_THAN_OR_EQUAL" | "IN" | "NOT_IN" | "CONTAINS";
export type EligibilityDataType = "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "ENUM";

export interface ProductEligibilityRule {
	id: number;
	productId: number;
	ruleType: EligibilityRuleType;
	ruleName: string;
	operator: EligibilityOperator;
	ruleValue: string;
	dataType: EligibilityDataType;
	isMandatory: boolean;
	errorMessage?: string | null;
	effectiveFrom: string;
	effectiveTo?: string | null;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateProductEligibilityRuleRequest {
	ruleType: EligibilityRuleType;
	ruleName: string;
	operator: EligibilityOperator;
	ruleValue: string;
	dataType: EligibilityDataType;
	isMandatory?: boolean;
	errorMessage?: string;
	effectiveFrom: string;
	effectiveTo?: string;
	isActive?: boolean;
}

