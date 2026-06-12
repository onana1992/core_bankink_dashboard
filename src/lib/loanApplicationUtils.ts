import type { LoanApplication } from "@/types/loan";
import type { Product, ProductFee, ProductInterestRate, ProductPeriod } from "@/types/product";

export function periodMonths(period?: ProductPeriod | LoanApplication["period"] | null): number {
	if (!period) return 12;
	if (period.periodMonths != null && period.periodMonths > 0) return period.periodMonths;
	if (period.periodYears != null && period.periodYears > 0) return period.periodYears * 12;
	if (period.periodDays != null && period.periodDays > 0) return Math.max(1, Math.round(period.periodDays / 30));
	return 12;
}

export function resolveAnnualRatePercent(
	period?: ProductPeriod | LoanApplication["period"] | null,
	product?: Product | null,
	lendingRates: ProductInterestRate[] = []
): number | null {
	if (period?.interestRate != null && period.interestRate > 0) {
		return period.interestRate;
	}
	if (product?.defaultInterestRate != null && product.defaultInterestRate > 0) {
		return product.defaultInterestRate;
	}
	const today = new Date().toISOString().slice(0, 10);
	const active = lendingRates
		.filter((r) => r.isActive && r.rateType === "LENDING")
		.filter((r) => r.effectiveFrom <= today && (!r.effectiveTo || r.effectiveTo >= today));
	return active[0]?.rateValue ?? null;
}

export function findActiveOpeningFee(fees: ProductFee[], currency: string): ProductFee | null {
	const today = new Date().toISOString().slice(0, 10);
	return (
		fees.find(
			(f) =>
				f.feeType === "OPENING" &&
				f.isActive &&
				f.currency === currency &&
				f.effectiveFrom <= today &&
				(!f.effectiveTo || f.effectiveTo >= today)
		) ?? null
	);
}

export function estimateOpeningFeeAmount(fee: ProductFee | null, principal: number): number | null {
	if (!fee || principal <= 0) return fee?.feeCalculationBase === "FIXED" ? (fee.feeAmount ?? 0) : null;

	let amount = 0;
	if (fee.feeCalculationBase === "FIXED") {
		amount = fee.feeAmount ?? 0;
	} else if (fee.feeCalculationBase === "TRANSACTION_AMOUNT" && fee.feePercentage != null) {
		amount = (principal * fee.feePercentage) / 100;
	} else if (fee.feeCalculationBase === "BALANCE" && fee.feePercentage != null) {
		amount = (principal * fee.feePercentage) / 100;
	} else {
		amount = fee.feeAmount ?? 0;
	}

	if (fee.minFee != null && amount < fee.minFee) amount = fee.minFee;
	if (fee.maxFee != null && amount > fee.maxFee) amount = fee.maxFee;
	return amount > 0 ? amount : 0;
}
