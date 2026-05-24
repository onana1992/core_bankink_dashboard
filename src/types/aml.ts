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
export type AmlDeclarationStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "CLOSED";
export type AmlDeclarationType = "SUSPICION" | "OTHER";
export type AmlTransmissionChannel = "PORTAL" | "EMAIL_SECURE" | "PHYSICAL" | "OTHER";
export type AmlCaseNoteType = "GENERAL" | "NON_DECLARATION_JUSTIFIED";

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

/** Corps de `POST /api/ops/aml/risk-profiles/clients/{id}/force` (UC-A02). */
export type ForceAmlRiskProfileRequest = {
	riskLevel: AmlRiskLevel;
	diligenceLevel: AmlDiligenceLevel;
	rationale: string;
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
};

export type CreateRuleDefinitionRequest = {
	code: string;
	name: string;
	category: AmlRuleCategory;
	description?: string | null;
};

/** Corps de `PUT /api/ops/aml/rules/{id}` — le code n'est pas modifiable. */
export type UpdateRuleDefinitionRequest = {
	name: string;
	category: AmlRuleCategory;
	description?: string | null;
};

export type PublishRuleVersionRequest = {
	effectiveFrom: string;
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
	ruleCode: string | null;
	ruleVersionNumber: number | null;
	clientId: number;
	accountId: number | null;
	transactionId: number | null;
	title: string;
	factsJson: string | null;
	assignedToUserId: number | null;
	assignedToUsername: string | null;
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
	authorUserId: number | null;
	authorUsername: string | null;
	body: string;
	createdAt: string;
};

export type AmlCaseDetailResponse = {
	id: number;
	publicRef: string;
	status: AmlCaseStatus;
	clientId: number;
	ownerUserId: number | null;
	ownerUsername: string | null;
	openedAt: string;
	closedAt: string | null;
	outcomeCode: string | null;
	alertIds: number[];
	notes: AmlCaseNoteResponse[];
};

/** Élément de liste paginée `GET /api/ops/aml/cases`. */
export type AmlCaseSummaryResponse = {
	id: number;
	publicRef: string;
	status: AmlCaseStatus;
	clientId: number;
	ownerUserId: number | null;
	ownerUsername: string | null;
	openedAt: string;
	closedAt: string | null;
	outcomeCode: string | null;
};

export type AmlCasePage = {
	content: AmlCaseSummaryResponse[];
	totalElements: number;
	totalPages: number;
	number: number;
	size: number;
	first?: boolean;
	last?: boolean;
};

export type CreateCaseRequest = {
	clientId: number;
	alertIds: number[];
	ownerUserId?: number | null;
};

export type AssignCaseOwnerRequest = {
	ownerUserId: number | null;
};

export type AddCaseAlertsRequest = {
	alertIds: number[];
};

export type AddCaseNoteRequest = {
	body: string;
};

export type PatchCaseStatusRequest = {
	status: AmlCaseStatus;
	comment?: string | null;
	outcomeCode?: string | null;
};

export type AmlCaseStatusHistoryResponse = {
	id: number;
	caseId: number;
	fromStatus: AmlCaseStatus | null;
	toStatus: AmlCaseStatus;
	changedByUserId: number | null;
	changedByUsername: string | null;
	changedAt: string;
	comment: string | null;
};

export type AmlDeclarationRecordResponse = {
	id: number;
	publicRef: string | null;
	caseId: number;
	status: AmlDeclarationStatus;
	declarationType: AmlDeclarationType;
	suspicionSummary: string | null;
	submittedAt: string | null;
	externalReference: string | null;
	transmissionChannel: AmlTransmissionChannel | null;
	notes: string | null;
	createdByUserId: number | null;
	createdByUsername: string | null;
	createdAt: string | null;
	validatedAt: string | null;
	acknowledgedAt: string | null;
	factsSnapshotJson: string | null;
};

/** Snapshot figé à la soumission (validation interne). */
export type AmlDeclarationFactsSnapshot = {
	casePublicRef?: string;
	capturedAt?: string;
	client?: {
		id: number;
		displayName: string;
		type: string;
		incorporationCountry: string;
	};
	riskProfile?: {
		riskLevel: string;
		riskScore: number;
		diligenceLevel: string;
		computedAt: string;
	};
	alerts?: Array<{
		publicRef: string;
		severity: string;
		title: string;
		factsJson: string | null;
		transactionId: number | null;
		createdAt: string;
	}>;
	notes?: Array<{
		noteType: string;
		body: string;
		createdAt: string;
	}>;
	screening?: Array<{
		type: string;
		result: string;
		checkedAt: string;
	}>;
};

export type CreateDeclarationRequest = {
	declarationType?: AmlDeclarationType;
	suspicionSummary?: string;
	suspicionStartDate?: string;
	suspicionEndDate?: string;
	amountInvolved?: number;
	currency?: string;
	notes?: string;
};

export type UpdateDeclarationRequest = CreateDeclarationRequest;

export type AcknowledgeTransmissionRequest = {
	submittedAt: string;
	externalReference: string;
	transmissionChannel: AmlTransmissionChannel;
	notes?: string;
};

export type CloseDeclarationRequest = {
	closureReason: string;
};

export type AmlDeclarationDetailResponse = AmlDeclarationRecordResponse & {
	casePublicRef: string | null;
	clientId: number | null;
	suspicionStartDate: string | null;
	suspicionEndDate: string | null;
	amountInvolved: number | null;
	currency: string | null;
	transmittedByUserId: number | null;
	transmittedByUsername: string | null;
	validatedByUserId: number | null;
	validatedByUsername: string | null;
	closedAt: string | null;
	closureReason: string | null;
	attachments: AmlDeclarationAttachmentResponse[];
};

export type AmlDeclarationAttachmentResponse = {
	id: number;
	proofType: string;
	originalFilename: string;
	contentType: string | null;
	sha256Hex: string;
	uploadedByUserId: number | null;
	uploadedByUsername: string | null;
	uploadedAt: string;
};

export type AmlDeclarationStatusHistoryResponse = {
	id: number;
	fromStatus: AmlDeclarationStatus | null;
	toStatus: AmlDeclarationStatus;
	changedByUserId: number | null;
	changedByUsername: string | null;
	changedAt: string;
	comment: string | null;
};

export type AmlDeclarationMetricsResponse = {
	submittedThisMonth: number;
	acknowledgedThisMonth: number;
	draftCount: number;
	submittedPendingTransmission: number;
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
