/**
 * Secteurs d'activité entreprise (liste fermée, sans code NACE).
 * Aligné avec les codes acceptés côté API / scoring KYC sensibles côté backend.
 */
export const BUSINESS_ACTIVITY_CATEGORY_VALUES = [
	"AGRICULTURE_FORESTRY_FISHING",
	"EXTRACTIVE_ENERGY",
	"MANUFACTURING",
	"CONSTRUCTION",
	"WHOLESALE_RETAIL_TRADE",
	"TRANSPORT_STORAGE",
	"ACCOMMODATION_FOOD",
	"ICT",
	"FINANCIAL_INSURANCE",
	"REAL_ESTATE",
	"PROFESSIONAL_ADMIN_SUPPORT",
	"PUBLIC_EDUCATION_HEALTH_SOCIAL",
	"ARTS_ENTERTAINMENT_SPORTS",
	"GAMING_GAMBLING_CRYPTO",
	"OTHER_SERVICES"
] as const;

export type BusinessActivityCategory = (typeof BUSINESS_ACTIVITY_CATEGORY_VALUES)[number];

export function isBusinessActivityCategory(value: string | null | undefined): value is BusinessActivityCategory {
	return value != null && (BUSINESS_ACTIVITY_CATEGORY_VALUES as readonly string[]).includes(value);
}
