import isoRows from "@/data/iso3166-countries-slim-2.json";

type IsoRow = { name: string; "alpha-2": string };

const ALPHA2_CODES: readonly string[] = [
	...new Set(
		(isoRows as IsoRow[])
			.map(r => r["alpha-2"])
			.filter((c): c is string => typeof c === "string" && /^[A-Z]{2}$/.test(c))
	)
];

export type NationalityOption = { code: string; label: string };

export function getNationalitySelectOptions(locale: string): NationalityOption[] {
	const lang = locale.toLowerCase().startsWith("fr") ? "fr" : "en";
	const dn = new Intl.DisplayNames([lang, "en"], { type: "region" });
	return [...ALPHA2_CODES]
		.map(code => ({ code, label: dn.of(code) ?? code }))
		.sort((a, b) => a.label.localeCompare(b.label, lang, { sensitivity: "base" }));
}

export function formatNationalityLabel(code: string | null | undefined, locale: string): string {
	if (code == null || !String(code).trim()) return "";
	const lang = locale.toLowerCase().startsWith("fr") ? "fr" : "en";
	try {
		const dn = new Intl.DisplayNames([lang, "en"], { type: "region" });
		return dn.of(String(code).trim().toUpperCase()) ?? String(code).trim().toUpperCase();
	} catch {
		return String(code).trim().toUpperCase();
	}
}
