import type {
	AddAddressRequest,
	AddRelatedPersonRequest,
	Address,
	CreateCustomerRequest,
	Customer,
	Document,
	DocumentType,
	RelatedPerson
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

async function handleJsonResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		let errorMessage = `HTTP ${res.status}`;
		try {
			const text = await res.text();
			if (text) {
				// Essayer de parser comme JSON pour les erreurs de validation
				try {
					const json = JSON.parse(text);
					// Extraire le message d'erreur principal
					if (json.message) {
						errorMessage = json.message;
					} else if (json.error) {
						errorMessage = json.error;
					} else if (json.errors) {
						// Si c'est un objet d'erreurs de validation
						const errors = typeof json.errors === 'string' 
							? json.errors 
							: Object.values(json.errors).join(', ');
						errorMessage = errors || text;
					} else {
						errorMessage = text;
					}
				} catch {
					errorMessage = text;
				}
			}
		} catch {
			// Ignorer les erreurs de lecture
		}
		throw new Error(errorMessage);
	}
	return (await res.json()) as T;
}

export const customersApi = {
	async list(): Promise<Customer[]> {
		const res = await fetch(`${API_BASE}/api/customers`, { cache: "no-store" });
		return handleJsonResponse<Customer[]>(res);
	},

	async create(payload: CreateCustomerRequest): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Customer>(res);
	},

	async get(id: number | string): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers/${id}`, { cache: "no-store" });
		return handleJsonResponse<Customer>(res);
	},

	async update(id: number | string, payload: Partial<CreateCustomerRequest>): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Customer>(res);
	},

	async getAddresses(id: number | string): Promise<Address[]> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/addresses`, { cache: "no-store" });
		return handleJsonResponse<Address[]>(res);
	},

	async addAddress(id: number | string, payload: AddAddressRequest): Promise<void> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/addresses`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async updateAddress(id: number | string, addressId: number | string, payload: AddAddressRequest): Promise<void> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/addresses/${addressId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async getDocuments(id: number | string): Promise<Document[]> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/documents`, { cache: "no-store" });
		return handleJsonResponse<Document[]>(res);
	},

	async uploadDocument(id: number | string, type: DocumentType, file: File): Promise<Document> {
		const form = new FormData();
		form.append("file", file);
		const res = await fetch(`${API_BASE}/api/customers/${id}/documents?type=${encodeURIComponent(type)}`, {
			method: "POST",
			body: form
		});
		return handleJsonResponse<Document>(res);
	},

	getDocumentUrl(id: number | string, documentId: number | string): string {
		return `${API_BASE}/api/customers/${id}/documents/${documentId}/download`;
	},

	async reviewDocument(
		id: number | string,
		documentId: number | string,
		status: "APPROVED" | "REJECTED",
		reviewerNote?: string
	): Promise<Document> {
		const usp = new URLSearchParams();
		usp.set("status", status);
		if (reviewerNote) {
			usp.set("reviewerNote", reviewerNote);
		}
		const res = await fetch(`${API_BASE}/api/customers/${id}/documents/${documentId}/review?${usp.toString()}`, {
			method: "PUT"
		});
		return handleJsonResponse<Document>(res);
	},

	async submitKyc(id: number | string): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/kyc/submit`, {
			method: "POST"
		});
		return handleJsonResponse<Customer>(res);
	},

	async verifyKyc(
		id: number | string,
		params: { riskScore?: number; pep?: boolean } = {}
	): Promise<Customer> {
		const usp = new URLSearchParams();
		if (typeof params.riskScore === "number") usp.set("riskScore", String(params.riskScore));
		if (typeof params.pep === "boolean") usp.set("pep", String(params.pep));
		const res = await fetch(`${API_BASE}/api/customers/${id}/kyc/verify?${usp.toString()}`, {
			method: "POST"
		});
		return handleJsonResponse<Customer>(res);
	},

	async rejectKyc(id: number | string, rejectionReason?: string): Promise<Customer> {
		const usp = new URLSearchParams();
		if (rejectionReason) {
			usp.set("rejectionReason", rejectionReason);
		}
		const res = await fetch(`${API_BASE}/api/customers/${id}/kyc/reject?${usp.toString()}`, {
			method: "POST"
		});
		return handleJsonResponse<Customer>(res);
	},

	async getRelatedPersons(id: number | string): Promise<RelatedPerson[]> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/related-persons`, { cache: "no-store" });
		return handleJsonResponse<RelatedPerson[]>(res);
	},

	async addRelatedPerson(id: number | string, payload: AddRelatedPersonRequest): Promise<RelatedPerson> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/related-persons`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<RelatedPerson>(res);
	},

	async updateRelatedPerson(
		id: number | string,
		relatedPersonId: number | string,
		payload: AddRelatedPersonRequest
	): Promise<RelatedPerson> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/related-persons/${relatedPersonId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<RelatedPerson>(res);
	},

	async deleteRelatedPerson(id: number | string, relatedPersonId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/related-persons/${relatedPersonId}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	}
};


