import type { TFunction } from "i18next";
import { translateApiError } from "@/lib/translateApiError";

/**
 * Uniformise les messages affichés (toasts / bandeaux) à partir d’une erreur API ou réseau.
 */
export function resolveApiExceptionMessage(err: unknown, t: TFunction): string {
	let msg = "";
	if (typeof err === "object" && err !== null && "message" in err && typeof (err as Error).message === "string") {
		msg = (err as Error).message;
	}

	const lower = msg.toLowerCase();
	if (
		lower.includes("failed to fetch") ||
		lower.includes("networkerror") ||
		lower.includes("network error") ||
		lower.includes("load failed") ||
		(lower.includes("fetch") && lower.includes("aborted"))
	) {
		const tr = t("apiErrors.network");
		if (tr !== "apiErrors.network") return tr;
		return "Impossible de joindre le serveur. Vérifiez la connexion et le backend.";
	}

	if (msg.trim()) {
		return translateApiError(msg, t);
	}

	const unk = t("apiErrors.unknown");
	return unk !== "apiErrors.unknown" ? unk : "Une erreur est survenue.";
}
