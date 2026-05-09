/** Aligné sur `KycCatalogEnums` et DTOs backend (`/api/ops/kyc`). */

export type KycRuleCategory = "SCORING" | "OVERRIDE" | "DECISION" | "CUSTOM";

export type KycRuleDefinitionResponse = {
	id: number;
	code: string;
	name: string;
	category: KycRuleCategory;
	description: string | null;
	drlFile: string | null;
	salience: number | null;
	algorithmVersion: string | null;
	ruleText: string | null;
};

export type CreateKycRuleDefinitionRequest = {
	code: string;
	name: string;
	category: KycRuleCategory;
	description?: string | null;
	drlFile?: string | null;
	salience?: number | null;
};

/** Corps de `PUT /api/ops/kyc/rules/{id}` — le code n’est pas modifiable. */
export type UpdateKycRuleDefinitionRequest = {
	name: string;
	category: KycRuleCategory;
	description?: string | null;
	drlFile?: string | null;
	salience?: number | null;
	algorithmVersion?: string | null;
	ruleText?: string | null;
};
