export function cn(...classes: Array<string | undefined | false | null>) {
	return classes.filter(Boolean).join(" ");
}

/**
 * Formate un montant avec devise. Si devise = XAF, affiche "FCFA" (ex. 1 000,50 FCFA).
 * @param amount Montant à formater
 * @param currency Code devise (ex. XAF, USD)
 * @param locale Locale pour le format nombre (ex. fr-FR, en-US)
 */
import type { AccountType } from "@/types";

/** Actif / Charge : débit − crédit ; Passif / Capitaux / Produit : crédit − débit */
export function computeLedgerBalanceFromTotals(
	accountType: AccountType,
	totalDebit: number,
	totalCredit: number
): number {
	if (accountType === "ASSET" || accountType === "EXPENSE") {
		return totalDebit - totalCredit;
	}
	return totalCredit - totalDebit;
}

export function formatAmount(amount: number, currency: string, locale: string = "fr-FR"): string {
	const code = (currency || "XAF").toUpperCase();
	if (code === "XAF") {
		const formatted = new Intl.NumberFormat(locale, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
		return `${formatted} FCFA`;
	}
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: code
	}).format(amount);
}


