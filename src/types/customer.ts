export type CustomerType = "PERSON" | "BUSINESS";
export type CustomerStatus = "DRAFT" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED";

export type KycCheckType = "ID_VERIFICATION" | "SANCTIONS_SCREENING" | "PEP_SCREENING" | "ADDRESS_VALIDATION";
export type KycCheckResult = "PASS" | "FAIL" | "REVIEW";

export interface KycCheck {
	id: number;
	type: KycCheckType;
	provider?: string | null;
	requestRef?: string | null;
	result: KycCheckResult;
	score?: number | null;
	rawJson?: string | null;
	checkedAt?: string;
}

export type ComplianceTaskType = "EDD_REVIEW" | "AML_REKYC_FOLLOWUP";
export type ComplianceTaskStatus = "OPEN" | "DONE" | "CANCELLED";

export interface ComplianceTask {
	id: number;
	taskType: ComplianceTaskType;
	status: ComplianceTaskStatus;
	instruction?: string | null;
	resolutionNote?: string | null;
	createdAt?: string;
	resolvedAt?: string | null;
	resolvedByUserId?: number | null;
}

/** Contribution pays (référentiel) pour le plancher de score risque KYC. */
export interface KycGeographyRiskLine {
	source: string;
	countryCode: string;
	tier: string;
	points: number;
}

export interface KycGeographyRiskResponse {
	geographyRiskPoints: number;
	suggestedRiskScoreFloor: number;
	contributions: KycGeographyRiskLine[];
}

/** Pilier ou sous-règle du moteur de score onboarding (phase 2). */
export interface KycOnboardingRiskComponent {
	code: string;
	label: string;
	floorAfterComponent: number;
	detail: string;
}

export interface KycOnboardingRiskAssessmentResponse {
	proposedRiskScore: number;
	riskBand: string;
	algorithmVersion: string;
	components: KycOnboardingRiskComponent[];
}

export interface Customer {
	id: number;
	type: CustomerType;
	displayName: string;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	phone?: string | null;
	status: CustomerStatus;
	riskScore?: number | null;
	pepFlag?: boolean | null;
	rejectionReason?: string | null;
	/** Motif re-KYC demandé par le flux AML (si applicable) */
	rekycPendingReason?: string | null;
	lastAmlRekycRequestedAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
	/** Sexe / genre (ex. MALE, FEMALE, OTHER) */
	gender?: string | null;
	/** Date de naissance (ISO date string) */
	birthDate?: string | null;
	/** Statut matrimonial (ex. SINGLE, MARRIED, DIVORCED, WIDOWED) */
	maritalStatus?: string | null;
	/** Nationalité ISO 3166-1 alpha-2 (ex. CM, FR) */
	nationality?: string | null;
	/** Résidence fiscale (ISO-3166-1 alpha-2) */
	taxResidenceCountry?: string | null;
	/** NIF / TIN (optionnel) */
	taxIdentificationNumber?: string | null;
	/** Personne physique : activité professionnelle */
	professionalActivity?: string | null;
	/** Personne physique : source de revenus */
	incomeSource?: string | null;
	/** Personne morale : nom commercial */
	tradeName?: string | null;
	legalForm?: string | null;
	registrationNumber?: string | null;
	incorporationDate?: string | null;
	incorporationCountry?: string | null;
	activityCode?: string | null;
	activityDescription?: string | null;
	signingAuthorityNote?: string | null;
	websiteUrl?: string | null;
	employeeCount?: number | null;
	annualRevenueBand?: string | null;
	currenciesUsed?: string | null;
	expectedTransactionProfile?: string | null;
	fundsSource?: string | null;
	accountOpeningPurpose?: string | null;
	emailReviewStatus?: "PENDING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
	profileReviewStatus?: "PENDING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
	identityReviewStatus?: "PENDING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}

export type AddressType = "RESIDENTIAL" | "BUSINESS" | "MAILING";

export interface Address {
	id: number;
	clientId: number;
	type: AddressType;
	line1: string;
	line2?: string | null;
	city: string;
	state?: string | null;
	postalCode?: string | null;
	country: string; // ISO-2
	primaryAddress: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export type DocumentType =
	| "ID_CARD"
	| "PASSPORT"
	| "PROOF_OF_ADDRESS"
	| "REGISTRATION_DOC"
	| "SELFIE";

/** Recto / verso pour les uploads `ID_CARD` (paramètre requête `idCardSide` côté API). */
export type IdCardSide = "RECTO" | "VERSO";

/** Options upload document OPS (query string + multipart fichier). */
export interface UploadDocumentOptions {
	idCardSide?: IdCardSide;
	identityDocumentNumber?: string;
	identityDocumentExpiresOn?: string;
}

export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Document {
	id: number;
	clientId: number;
	type: DocumentType;
	fileName?: string | null;
	contentType?: string | null;
	storageKey: string;
	checksum?: string | null;
	status: DocumentStatus;
	reviewerNote?: string | null;
	identityDocumentNumber?: string | null;
	identityDocumentExpiresOn?: string | null;
	uploadedAt?: string;
	reviewedAt?: string | null;
}

export interface CreateCustomerRequest {
	type: CustomerType;
	displayName: string;
	firstName?: string;
	lastName?: string;
	email: string;
	phone?: string;
}

/** Payload pour la mise à jour d'un client (tous les champs optionnels) */
export interface UpdateCustomerRequest {
	displayName?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	gender?: string | null;
	birthDate?: string | null;
	maritalStatus?: string | null;
	/** ISO 3166-1 alpha-2 */
	nationality?: string | null;
	taxResidenceCountry?: string | null;
	taxIdentificationNumber?: string | null;
	/** Personne physique : activité professionnelle */
	professionalActivity?: string | null;
	/** Personne physique : source de revenus */
	incomeSource?: string | null;
	/** BUSINESS */
	tradeName?: string | null;
	legalForm?: string | null;
	registrationNumber?: string | null;
	incorporationDate?: string | null;
	incorporationCountry?: string | null;
	activityCode?: string | null;
	activityDescription?: string | null;
	signingAuthorityNote?: string | null;
	websiteUrl?: string | null;
	employeeCount?: number | null;
	annualRevenueBand?: string | null;
	currenciesUsed?: string | null;
	expectedTransactionProfile?: string | null;
	fundsSource?: string | null;
	accountOpeningPurpose?: string | null;
}

export interface AddAddressRequest {
	type: AddressType;
	line1: string;
	line2?: string;
	city: string;
	state?: string;
	postalCode?: string;
	country: string;
	primaryAddress?: boolean;
}

export type RelatedPersonRole = "UBO" | "DIRECTOR" | "SIGNATORY";

export interface RelatedPerson {
	id: number;
	clientId: number;
	role: RelatedPersonRole;
	firstName: string;
	lastName: string;
	dateOfBirth?: string | null;
	nationalId?: string | null;
	nationality?: string | null;
	residenceLine1?: string | null;
	residenceCity?: string | null;
	residencePostalCode?: string | null;
	residenceCountry?: string | null;
	email?: string | null;
	phone?: string | null;
	pepFlag: boolean;
	ownershipPercent?: number | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface AddRelatedPersonRequest {
	role: RelatedPersonRole;
	firstName: string;
	lastName: string;
	dateOfBirth?: string;
	nationalId?: string;
	ownershipPercent?: number;
	pepFlag?: boolean;
	nationality?: string;
	residenceLine1?: string;
	residenceCity?: string;
	residencePostalCode?: string;
	residenceCountry?: string;
	email?: string;
	phone?: string;
}


