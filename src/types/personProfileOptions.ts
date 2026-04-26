/** Codes stables pour `Client.professionalActivity` (personne physique). */
export const PERSON_PROFESSION_VALUES = [
	"EMPLOYEE_PRIVATE",
	"EMPLOYEE_PUBLIC",
	"SELF_EMPLOYED",
	"MERCHANT",
	"CRAFTSPERSON",
	"LIBERAL_PROFESSION",
	"FARMER",
	"STUDENT",
	"RETIRED",
	"UNEMPLOYED",
	"HOMEMAKER",
	"OTHER"
] as const;

export type PersonProfessionValue = (typeof PERSON_PROFESSION_VALUES)[number];

/** Codes stables pour `Client.incomeSource` (personne physique). */
export const PERSON_INCOME_SOURCE_VALUES = [
	"SALARY",
	"SELF_EMPLOYMENT",
	"BUSINESS_INCOME",
	"RENTAL_INCOME",
	"INVESTMENT_INCOME",
	"PENSION",
	"ALLOWANCE_FAMILY",
	"SOCIAL_BENEFITS",
	"SAVINGS",
	"MIXED",
	"OTHER"
] as const;

export type PersonIncomeSourceValue = (typeof PERSON_INCOME_SOURCE_VALUES)[number];

const PROFESSION_SET = new Set<string>(PERSON_PROFESSION_VALUES);
const INCOME_SET = new Set<string>(PERSON_INCOME_SOURCE_VALUES);

export function isPersonProfessionValue(v: string): v is PersonProfessionValue {
	return PROFESSION_SET.has(v);
}

export function isPersonIncomeSourceValue(v: string): v is PersonIncomeSourceValue {
	return INCOME_SET.has(v);
}
