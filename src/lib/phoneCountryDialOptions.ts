import dialByIso2 from "@/data/e164-dial-by-alpha2.json";

export type PhoneDialOption = {
	iso2: string;
	dial: string;
	label: string;
};

const DIAL_MAP = dialByIso2 as Record<string, string>;

export function getDialForIso2(iso2: string): string {
	const code = iso2.trim().toUpperCase();
	return DIAL_MAP[code] ?? "";
}

export function getPhoneDialSelectOptions(locale: string): PhoneDialOption[] {
	const lang = locale.toLowerCase().startsWith("fr") ? "fr" : "en";
	const dn = new Intl.DisplayNames([lang, "en"], { type: "region" });
	return Object.entries(DIAL_MAP)
		.map(([iso2, dial]) => ({
			iso2,
			dial,
			label: dn.of(iso2) ?? iso2
		}))
		.sort((a, b) => a.label.localeCompare(b.label, lang, { sensitivity: "base" }));
}

/**
 * Numéro E.164 simplifié pour l’API : "+{indicatif} {partie nationale}".
 * La partie nationale peut contenir espaces, tirets, parenthèses (validés ensuite par la regex téléphone).
 */
export function composeInternationalPhone(iso2: string, nationalNumber: string): string {
	const dial = getDialForIso2(iso2);
	let nat = nationalNumber.trim().replace(/^\++/, "");
	if (dial && nat.startsWith(dial)) {
		nat = nat.slice(dial.length).replace(/^[\s\-().]+/, "");
	}
	if (!dial) {
		return nat ? `+${nat}` : "";
	}
	return nat ? `+${dial} ${nat}` : `+${dial}`;
}
