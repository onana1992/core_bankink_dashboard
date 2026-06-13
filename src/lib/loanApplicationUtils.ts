import type { LoanApplication } from "@/types/loan";
import type { Product, ProductFee, ProductInterestRate, ProductPeriod } from "@/types/product";

export function periodMonths(period?: ProductPeriod | LoanApplication["period"] | null): number {
	if (!period) return 12;
	if (period.periodMonths != null && period.periodMonths > 0) return period.periodMonths;
	if (period.periodYears != null && period.periodYears > 0) return period.periodYears * 12;
	if (period.periodDays != null && period.periodDays > 0) return Math.max(1, Math.round(period.periodDays / 30));
	return 12;
}

function compareGridTier(a: ProductInterestRate, b: ProductInterestRate): number {
	const minA = a.minAmount ?? -Infinity;
	const minB = b.minAmount ?? -Infinity;
	if (minA !== minB) return minB - minA;
	const periodA = a.minPeriodDays ?? -Infinity;
	const periodB = b.minPeriodDays ?? -Infinity;
	if (periodA !== periodB) return periodB - periodA;
	return a.id - b.id;
}

export function resolveAnnualRatePercent(
	period?: ProductPeriod | LoanApplication["period"] | null,
	product?: Product | null,
	lendingRates: ProductInterestRate[] = [],
	principal = 0
): number | null {
	if (period?.interestRate != null && period.interestRate > 0) {
		return period.interestRate;
	}

	const periodDays = period?.periodDays ?? null;
	const today = new Date().toISOString().slice(0, 10);
	const active = lendingRates
		.filter((r) => r.isActive && r.rateType === "LENDING")
		.filter((r) => r.effectiveFrom <= today && (!r.effectiveTo || r.effectiveTo >= today))
		.filter((r) => {
			if (principal > 0) {
				if (r.minAmount != null && principal < r.minAmount) return false;
				if (r.maxAmount != null && principal > r.maxAmount) return false;
			}
			if (periodDays != null) {
				if (r.minPeriodDays != null && periodDays < r.minPeriodDays) return false;
				if (r.maxPeriodDays != null && periodDays > r.maxPeriodDays) return false;
			}
			return true;
		})
		.sort(compareGridTier);

	if (active[0]?.rateValue != null && active[0].rateValue > 0) {
		return active[0].rateValue;
	}
	if (product?.defaultInterestRate != null && product.defaultInterestRate > 0) {
		return product.defaultInterestRate;
	}
	return null;
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
