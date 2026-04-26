/** NACE Rév.2, niveau classe (quatre chiffres avec point). */
const NACE_CLASS = /^\d{2}\.\d{2}$/;

export function normalizeNaceClassCode(raw: string): string {
	return raw.trim().replace(",", ".").replace(/\s+/g, "");
}

export function isValidNaceClassCode(raw: string): boolean {
	return NACE_CLASS.test(normalizeNaceClassCode(raw));
}
