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

export type DocumentType = "ID_CARD" | "PASSPORT" | "PROOF_OF_ADDRESS" | "REGISTRATION_DOC" | "SELFIE";
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
	uploadedAt?: string;
	reviewedAt?: string | null;
}

export interface CreateCustomerRequest {
	type: CustomerType;
	displayName: string;
	firstName?: string;
	lastName?: string;
	email?: string;
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
}


