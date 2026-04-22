/** Formes juridiques courantes (libellé = valeur pour les listes). */
export const LEGAL_FORM_OPTIONS: readonly string[] = [
	"SARL",
	"SAS",
	"SA",
	"SASU",
	"EURL",
	"SNC",
	"SCI",
	"ASSOCIATION",
	"GIE",
	"AUTRE"
] as const;

export const ANNUAL_REVENUE_BAND_OPTIONS: readonly { value: string }[] = [
	{ value: "UNDER_250K" },
	{ value: "250K_1M" },
	{ value: "1M_5M" },
	{ value: "5M_25M" },
	{ value: "OVER_25M" },
	{ value: "UNKNOWN" }
] as const;
