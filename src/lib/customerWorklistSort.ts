import type { Customer, CustomerStatus } from "@/types";

export type CustomerWorklistSortMode = "priority" | "risk_desc" | "recent";

/** Bande affichée (P1 = le plus urgent côté ops). */
const STATUS_PRIORITY: Record<CustomerStatus, number> = {
	PENDING_REVIEW: 1,
	BLOCKED: 2,
	DRAFT: 3,
	REJECTED: 4,
	VERIFIED: 5
};

export function customerWorklistTier(status: CustomerStatus): number {
	return STATUS_PRIORITY[status] ?? 99;
}

export function customerWorklistTierLabel(status: CustomerStatus): string {
	const n = customerWorklistTier(status);
	return `P${n}`;
}

/** Âge du dossier en jours depuis createdAt ; null si inconnu. */
export function customerDossierAgeDays(c: Pick<Customer, "createdAt">): number | null {
	if (!c.createdAt) return null;
	const t = new Date(c.createdAt).getTime();
	if (!Number.isFinite(t)) return null;
	const days = Math.floor((Date.now() - t) / 86400000);
	return Math.max(0, days);
}

function tieBreakThenId(a: Customer, b: Customer): number {
	const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
	const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
	if (tb !== ta) return tb - ta;
	return b.id - a.id;
}

export function compareCustomersWorklist(a: Customer, b: Customer, mode: CustomerWorklistSortMode): number {
	if (mode === "recent") {
		return tieBreakThenId(a, b);
	}
	if (mode === "risk_desc") {
		const ra = typeof a.riskScore === "number" ? a.riskScore : -1;
		const rb = typeof b.riskScore === "number" ? b.riskScore : -1;
		if (rb !== ra) return rb - ra;
		const pa = customerWorklistTier(a.status);
		const pb = customerWorklistTier(b.status);
		if (pa !== pb) return pa - pb;
		return tieBreakThenId(a, b);
	}
	const pa = customerWorklistTier(a.status);
	const pb = customerWorklistTier(b.status);
	if (pa !== pb) return pa - pb;
	const ra = typeof a.riskScore === "number" ? a.riskScore : -1;
	const rb = typeof b.riskScore === "number" ? b.riskScore : -1;
	if (rb !== ra) return rb - ra;
	const aa = customerDossierAgeDays(a) ?? -1;
	const ba = customerDossierAgeDays(b) ?? -1;
	if (ba !== aa) return ba - aa;
	return tieBreakThenId(a, b);
}
