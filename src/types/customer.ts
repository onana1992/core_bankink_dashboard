export type CustomerType = "PERSON" | "BUSINESS";
export type CustomerStatus = "DRAFT" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED";

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
	createdAt?: string;
	updatedAt?: string;
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


