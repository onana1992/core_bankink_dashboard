import type { LoanRepaymentMetadata } from "@types/loan";

export function parseLoanRepaymentMetadata(metadata: string | null | undefined): LoanRepaymentMetadata | null {
	if (!metadata) return null;
	try {
		const parsed = JSON.parse(metadata) as Record<string, unknown>;
		return {
			sourceAccountId: typeof parsed.sourceAccountId === "number" ? parsed.sourceAccountId : null,
			penaltyAllocation: toNumber(parsed.penaltyAllocation ?? parsed.penaltyPaid),
			principalPaid: toNumber(parsed.principalPaid),
			interestPaid: toNumber(parsed.interestPaid),
		};
	} catch {
		return null;
	}
}

function toNumber(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}
