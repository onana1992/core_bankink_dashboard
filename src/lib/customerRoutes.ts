import type { CustomerType } from "@/types";

/** URL canonique du dossier client selon le type (personne morale / physique). */
export function customerDetailPath(id: number, type: CustomerType): string {
	return type === "BUSINESS" ? `/customers/business/${id}` : `/customers/person/${id}`;
}
