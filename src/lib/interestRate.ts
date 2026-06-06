import type { CalculationMethod, CompoundingFrequency, ProductInterestRate } from "@/types";

/** Fréquence autorisée hors mode composé : uniquement DAILY (intérêts courus). */
export function normalizeCompoundingFrequency(
	calculationMethod: CalculationMethod,
	compoundingFrequency?: CompoundingFrequency | null
): CompoundingFrequency | undefined {
	if (calculationMethod === "COMPOUND") {
		return compoundingFrequency ?? undefined;
	}
	return compoundingFrequency === "DAILY" ? "DAILY" : undefined;
}

export function formatInterestRateMethodLabel(
	rate: Pick<ProductInterestRate, "calculationMethod" | "compoundingFrequency">,
	t: (key: string) => string
): string {
	const method = t(`product.detail.rates.calculationMethods.${rate.calculationMethod}`);
	if (rate.calculationMethod === "COMPOUND" && rate.compoundingFrequency) {
		return `${method} (${t(`product.detail.rates.compoundingFrequencies.${rate.compoundingFrequency}`)})`;
	}
	if (rate.compoundingFrequency === "DAILY") {
		return `${method} (${t("product.detail.rates.dailyAccrual")})`;
	}
	return method;
}

export function shouldShowCompoundingFrequencyInModal(rate: ProductInterestRate): boolean {
	if (rate.calculationMethod === "COMPOUND") {
		return !!rate.compoundingFrequency;
	}
	return rate.calculationMethod === "SIMPLE" || rate.calculationMethod === "FLOATING";
}

export function compoundingFrequencyModalLabel(
	rate: ProductInterestRate,
	t: (key: string) => string
): string {
	if (rate.calculationMethod === "COMPOUND") {
		return t("product.detail.rates.modal.compoundingFrequency");
	}
	return t("product.detail.rates.modal.accrualMode");
}

export function compoundingFrequencyModalValue(
	rate: ProductInterestRate,
	t: (key: string) => string
): string {
	if (rate.calculationMethod === "COMPOUND" && rate.compoundingFrequency) {
		return t(`product.detail.rates.compoundingFrequencies.${rate.compoundingFrequency}`);
	}
	if (rate.compoundingFrequency === "DAILY") {
		return t("product.detail.rates.dailyAccrual");
	}
	return t("product.detail.rates.monthlyPayout");
}
