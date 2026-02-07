import type { TFunction } from "i18next";

/**
 * Traduit un message d'erreur renvoyé par l'API (clé ou texte) pour l'affichage toast / UI.
 */
export function translateApiError(message: string, t: TFunction): string {
	if (!message || typeof message !== "string") return message;

	// Si le message est déjà une clé de traduction (ex. account.new.errors.openingFeeZeroAmount), la traduire
	if (message.startsWith("account.") && message.includes(".")) {
		const translated = t(message);
		if (translated !== message) return translated;
	}

	// Erreurs de montant (format: "error.key:amount:limit" ou "error.key:amount:limit:currency")
	const amountMatch = message.match(
		/^error\.opening\.amount\.(below\.minimum|exceeds\.maximum|below\.period\.minimum|exceeds\.period\.maximum):([^:]+):([^:]+)(?::([^:]+))?$/
	);
	if (amountMatch) {
		const [, kind, amount, limit, currency] = amountMatch;
		const curr = currency && currency.trim() ? currency.trim() : "XAF";
		if (kind === "below.minimum") return t("account.new.errors.openingAmountBelowMinimum", { amount, minimum: limit, currency: curr });
		if (kind === "exceeds.maximum") return t("account.new.errors.openingAmountExceedsMaximum", { amount, maximum: limit, currency: curr });
		if (kind === "below.period.minimum") return t("account.new.errors.openingAmountBelowPeriodMinimum", { amount, minimum: limit, currency: curr });
		return t("account.new.errors.openingAmountExceedsPeriodMaximum", { amount, maximum: limit, currency: curr });
	}

	// Erreurs JS internes
	if (/undefined|reading\s+['"]?\w+['"]?/i.test(message)) return t("account.new.errors.openError");

	// Clés d'erreur connues (backend)
	if (message.includes("error.source.account.different.client")) return t("account.new.errors.sourceAccountDifferentClient");
	if (message.includes("error.source.account.not.found")) return t("account.new.errors.sourceAccountRequired");
	if (message.includes("error.opening.fee.requires.source.account")) return t("account.new.errors.sourceAccountRequired");
	if (message.includes("error.opening.fee.zero.amount")) return t("account.new.errors.openingFeeZeroAmount");
	if (message.includes("error.client.not.found")) return t("account.new.errors.clientNotFound");
	if (message.includes("error.client.must.be.verified")) return t("account.new.clientMustBeVerified");
	if (message.includes("error.product.not.found")) return t("account.new.errors.productNotFound");
	if (message.includes("error.product.must.be.active")) return t("account.new.errors.productMustBeActive");

	// Clé générique error.xxx -> account.new.errors.xxx
	if (message.startsWith("error.")) {
		const key = message.replace("error.", "").replace(/\./g, "");
		const translationKey = `account.new.errors.${key}`;
		const translated = t(translationKey);
		if (translated !== translationKey) return translated;
	}

	// Message déjà traduit ou inconnu
	return message;
}
