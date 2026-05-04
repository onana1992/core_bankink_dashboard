/** Aligné sur `AmlEnums` et DTOs backend (`/api/ops/aml`). */

export type AmlRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AmlDiligenceLevel = "STANDARD" | "ENHANCED";
export type AmlRuleCategory =
	| "AMOUNT"
	| "VELOCITY"
	| "STRUCTURING"
	| "COUNTERPARTY"
	| "GEO"
	| "CHANNEL"
	| "CREDIT"
	| "CUSTOM";
export type AmlAlertSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AmlAlertStatus = "NEW" | "ASSIGNED" | "UNDER_REVIEW" | "ESCALATED" | "CLOSED";
export type AmlCaseStatus = "OPEN" | "IN_REVIEW" | "ESCALATED" | "CLOSED";
export type AmlClosureReason = "FALSE_POSITIVE" | "EXPLAINED" | "ESCALATED_DECLARATION" | "OTHER";
export type AmlTriggerType = "RULE" | "MANUAL" | "SCREENING";

export type AmlRiskProfileDto = {
	id: number;
	clientId: number;
	riskLevel: AmlRiskLevel;
	riskScore: number | null;
	diligenceLevel: AmlDiligenceLevel;
	factorsJson: string | null;
	computedAt: string;
	computedBy: string | null;
	active: boolean;
};

export type AmlRuleDefinitionResponse = {
	id: number;
	code: string;
	name: string;
	category: AmlRuleCategory;
	description: string | null;
};

export type AmlRuleVersionResponse = {
	id: number;
	version: number;
	effectiveFrom: string;
	effectiveTo: string | null;
	enabled: boolean;
	parametersJson: string;
};

export type CreateRuleDefinitionRequest = {
	code: string;
	name: string;
	category: AmlRuleCategory;
	description?: string | null;
};

export type PublishRuleVersionRequest = {
	effectiveFrom: string;
	/** Optionnel ; non utilisé par Drools (défaut `{}` côté API). */
	parametersJson?: string | null;
	enabled: boolean;
};

export type AmlAlertResponse = {
	id: number;
	publicRef: string;
	idempotencyKey: string | null;
	severity: AmlAlertSeverity;
	status: AmlAlertStatus;
	triggerType: AmlTriggerType;
	ruleDefinitionId: number | null;
	ruleVersionId: number | null;
	clientId: number;
	accountId: number | null;
	transactionId: number | null;
	title: string;
	factsJson: string | null;
	assignedToUserId: number | null;
	createdAt: string;
	updatedAt: string;
	closedAt: string | null;
	closureReasonCode: AmlClosureReason | null;
	closureComment: string | null;
};

export type CreateManualAlertRequest = {
	clientId: number;
	accountId?: number | null;
	transactionId?: number | null;
	severity: AmlAlertSeverity;
	title: string;
	facts: Record<string, unknown>;
};

export type AssignAlertRequest = {
	assigneeUserId: number;
};

export type PatchAlertStatusRequest = {
	status: AmlAlertStatus;
};

export type CloseAlertRequest = {
	closureReasonCode: AmlClosureReason;
	closureComment?: string | null;
};

export type AmlCaseNoteResponse = {
	id: number;
	authorUserId: number;
	body: string;
	createdAt: string;
};

export type AmlCaseDetailResponse = {
	id: number;
	publicRef: string;
	status: AmlCaseStatus;
	clientId: number;
	ownerUserId: number | null;
	openedAt: string;
	closedAt: string | null;
	outcomeCode: string | null;
	alertIds: number[];
	notes: AmlCaseNoteResponse[];
};

export type CreateCaseRequest = {
	clientId: number;
	alertIds: number[];
	ownerUserId?: number | null;
};

export type AddCaseNoteRequest = {
	body: string;
};

export type PatchCaseStatusRequest = {
	status: AmlCaseStatus;
	comment?: string | null;
	outcomeCode?: string | null;
};

export type AmlAlertPage = {
	content: AmlAlertResponse[];
	totalElements: number;
	totalPages: number;
	number: number;
	size: number;
	first?: boolean;
	last?: boolean;
};

export type CreateDeclarationResponse = {
	id: number;
	caseId: number;
	status: string;
};
