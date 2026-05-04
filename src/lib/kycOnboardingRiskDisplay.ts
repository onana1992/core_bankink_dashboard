import type { KycOnboardingRiskAssessmentResponse } from "@/types/customer";

/**
 * Indique si la réponse API expose les métadonnées du moteur (decision, matchedRules, etc.).
 */
export function kycOnboardingRiskShowsEngineMetadata(
	response: KycOnboardingRiskAssessmentResponse | null | undefined
): boolean {
	if (!response) return false;
	if (response.decision != null && String(response.decision).trim() !== "") return true;
	const rules = response.matchedRules;
	return Array.isArray(rules) && rules.length > 0;
}
