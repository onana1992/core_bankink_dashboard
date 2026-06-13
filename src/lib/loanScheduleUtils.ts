import type { LoanScheduleItem } from "@types/loan";

/** Capital encore dû sur une ligne (montant prévu − déjà payé). */
export function installmentPrincipalDue(line: LoanScheduleItem): number {
	return Math.max(0, Number(line.principalAmount ?? 0) - Number(line.paidPrincipal ?? 0));
}

/** Intérêts encore dus sur une ligne (montant prévu − déjà payé). */
export function installmentInterestDue(line: LoanScheduleItem): number {
	return Math.max(0, Number(line.interestAmount ?? 0) - Number(line.paidInterest ?? 0));
}

/** Reste à payer sur une ligne d'échéancier (capital + intérêts non soldés). */
export function installmentRemainingDue(line: LoanScheduleItem): number {
	return installmentPrincipalDue(line) + installmentInterestDue(line);
}

/** Agrégats échéancier : CRD, intérêts restants et total (échéances PARTIAL incluses). */
export function sumScheduleDueAmounts(schedule: LoanScheduleItem[]): {
	capitalRemaining: number;
	interestRemaining: number;
	scheduleRemaining: number;
} {
	let capitalRemaining = 0;
	let interestRemaining = 0;
	for (const row of schedule) {
		capitalRemaining += installmentPrincipalDue(row);
		interestRemaining += installmentInterestDue(row);
	}
	return {
		capitalRemaining,
		interestRemaining,
		scheduleRemaining: capitalRemaining + interestRemaining
	};
}
