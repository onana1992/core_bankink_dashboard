/** Contraintes alignées pratique bancaire KYC — personne physique (onboarding). */

export const PERSON_NAME_MAX_LEN = 150;
/** Aligné entité Client.display_name (255). */
export const DISPLAY_NAME_MAX_LEN = 255;
export const EMAIL_MAX_LEN = 254;
export const PHONE_MAX_LEN = 50;
export const PHONE_MIN_DIGITS = 8;
export const ADDRESS_LINE_MAX = 255;
export const ADDRESS_LINE_MIN = 5;
export const CITY_MAX_LEN = 120;
export const CITY_MIN_LEN = 2;
export const POSTAL_CODE_MAX_LEN = 30;
export const POSTAL_CODE_MIN_LEN = 2;
export const IDENTITY_DOC_NUMBER_MAX = 64;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MIN_CLIENT_AGE = 18;
export const MAX_CLIENT_AGE = 110;
/** Avertissement banque : pièce encore valide au-delà de X jours après aujourd'hui */
export const MIN_ID_VALIDITY_DAYS = 30;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseIsoLocalDate(iso: string): Date | null {
	const t = iso.trim();
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]) - 1;
	const d = Number(m[3]);
	const dt = new Date(y, mo, d);
	if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
	return dt;
}

export function countPhoneDigits(raw: string): number {
	return (raw.match(/\d/g) ?? []).length;
}

export function isValidEmailFormat(email: string): boolean {
	const s = email.trim();
	if (s.length > EMAIL_MAX_LEN) return false;
	return EMAIL_REGEX.test(s);
}

export function isValidPhoneBanking(raw: string): boolean {
	const s = raw.trim();
	if (!s || s.length > PHONE_MAX_LEN) return false;
	if (!/^[+]?[0-9\s\-().]+$/.test(s)) return false;
	const digits = countPhoneDigits(s);
	return digits >= PHONE_MIN_DIGITS && digits <= 32;
}

export function ageFromBirthDate(iso: string): number | null {
	const birth = parseIsoLocalDate(iso);
	if (!birth) return null;
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const md = today.getMonth() - birth.getMonth();
	if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}

export function isValidBirthDateForBanking(iso: string): { ok: boolean; age: number | null } {
	const age = ageFromBirthDate(iso);
	if (age === null) return { ok: false, age: null };
	if (age < MIN_CLIENT_AGE || age > MAX_CLIENT_AGE) return { ok: false, age };
	return { ok: true, age };
}

export function isIsoDateStrictlyFuture(iso: string): boolean {
	const d = parseIsoLocalDate(iso);
	if (!d) return false;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return d.getTime() > today.getTime();
}

export function isIsoDateAtLeastDaysAhead(iso: string, minDays: number): boolean {
	const d = parseIsoLocalDate(iso);
	if (!d) return false;
	const limit = new Date();
	limit.setHours(0, 0, 0, 0);
	limit.setDate(limit.getDate() + minDays);
	return d.getTime() >= limit.getTime();
}

export function isImageFile(f: File | null): boolean {
	return f != null && (f.type?.startsWith("image/") ?? false);
}

export function isImageOrPdfFile(f: File | null): boolean {
	if (f == null) return false;
	const t = f.type ?? "";
	return t.startsWith("image/") || t === "application/pdf";
}

export function isFileSizeOk(f: File | null, maxBytes: number): boolean {
	return f != null && f.size > 0 && f.size <= maxBytes;
}
