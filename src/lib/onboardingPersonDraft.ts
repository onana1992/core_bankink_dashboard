import type { AddAddressRequest, CreateCustomerRequest } from "@/types";

/** Brouillon local wizard personne physique (pas de fichier — renvoi des métadonnées uniquement). */
export const OPS_ONBOARDING_PERSON_DRAFT_KEY = "ops-onboarding-person-draft-v3";

export interface PersonWizardDraftSnap {
	step: number;
	identity: CreateCustomerRequest;
	profile: {
		gender: string;
		birthDate: string;
		maritalStatus: string;
		nationality: string;
		taxResidenceCountry: string;
		taxIdentificationNumber: string;
		professionalActivity: string;
		incomeSource: string;
	};
	phoneDialIso2: string;
	phoneNational: string;
	address: AddAddressRequest;
	idDocType: "ID_CARD" | "PASSPORT";
	identityDocumentNumber: string;
	identityDocumentExpiresOn: string;
	identityIssuingCountry: string;
	fileNames: {
		idRecto?: string;
		idVerso?: string;
		passport?: string;
		selfie?: string;
		poa?: string;
	};
}

export function clearPersonDraft(): void {
	try {
		if (typeof window === "undefined") return;
		localStorage.removeItem(OPS_ONBOARDING_PERSON_DRAFT_KEY);
	} catch {
		/* ignore */
	}
}

export function loadPersonDraft(): PersonWizardDraftSnap | null {
	try {
		if (typeof window === "undefined") return null;
		const raw = localStorage.getItem(OPS_ONBOARDING_PERSON_DRAFT_KEY);
		if (!raw) return null;
		const o = JSON.parse(raw) as { v?: number; payload?: PersonWizardDraftSnap };
		if (o?.v !== 3 || !o.payload) return null;
		return o.payload;
	} catch {
		return null;
	}
}

export function savePersonDraft(payload: PersonWizardDraftSnap): void {
	try {
		if (typeof window === "undefined") return;
		localStorage.setItem(OPS_ONBOARDING_PERSON_DRAFT_KEY, JSON.stringify({ v: 3, payload }));
	} catch {
		/* quota / private mode */
	}
}
