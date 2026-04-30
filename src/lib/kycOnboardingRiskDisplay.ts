import type { KycOnboardingRiskAssessmentResponse } from "@types/customer";

/**
 * Indique si la réponse API expose les champs du moteur Drools (ADVISORY / ENFORCED).
 * En SHADOW, le backend renvoie le legacy avec decision / matchedRules absents.
 */
export function kycOnboardingRiskShowsEngineMetadata(
	response: KycOnboardingRiskAssessmentResponse | null | undefined
): boolean {
	if (!response) return false;
	if (response.decision != null && String(response.decision).trim() !== "") return true;
	const rules = response.matchedRules;
	return Array.isArray(rules) && rules.length > 0;
}
