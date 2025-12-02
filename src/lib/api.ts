import type {
	AddAddressRequest,
	AddRelatedPersonRequest,
	Address,
	CreateCustomerRequest,
	Customer,
	Document,
	DocumentType,
	RelatedPerson,
	Product,
	ProductCategory,
	ProductStatus,
	CreateProductRequest,
	UpdateProductRequest,
	ProductInterestRate,
	CreateProductInterestRateRequest,
	ProductFee,
	CreateProductFeeRequest,
	ProductLimit,
	CreateProductLimitRequest,
	ProductPeriod,
	CreateProductPeriodRequest,
	ProductPenalty,
	CreateProductPenaltyRequest,
	ProductEligibilityRule,
	CreateProductEligibilityRuleRequest,
	Account,
	OpenProductRequest,
	CloseAccountRequest,
	FreezeAccountRequest,
	SuspendAccountRequest
} from "@/types";

// Validate and set API base URL
const getApiBase = (): string => {
	const envBase = process.env.NEXT_PUBLIC_API_BASE;
	if (envBase && envBase.trim() !== "") {
		// Ensure it starts with http:// or https://
		const trimmed = envBase.trim();
		if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
			return trimmed;
		}
		// If it doesn't have a scheme, add http://
		return `http://${trimmed}`;
	}
	return "http://localhost:8080";
};

const API_BASE = getApiBase();

async function handleJsonResponse<T>(res: Response): Promise<T> {
	// Gérer les réponses vides (204 No Content, etc.) avant de vérifier res.ok
	if (res.status === 204 || (res.status >= 200 && res.status < 300 && !res.headers.get('content-type')?.includes('application/json'))) {
		return undefined as T;
	}

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

	// Lire le texte une seule fois
	const text = await res.text();
	if (!text || text.trim() === '') {
		return undefined as T;
	}
	
	try {
		return JSON.parse(text) as T;
	} catch {
		// Si ce n'est pas du JSON valide, retourner undefined
		return undefined as T;
	}
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

export const productsApi = {
	async list(params?: { category?: ProductCategory; status?: ProductStatus }): Promise<Product[]> {
		const usp = new URLSearchParams();
		if (params?.category) usp.set("category", params.category);
		if (params?.status) usp.set("status", params.status);
		const query = usp.toString();
		const res = await fetch(`${API_BASE}/api/products${query ? `?${query}` : ""}`, { cache: "no-store" });
		return handleJsonResponse<Product[]>(res);
	},

	async create(payload: CreateProductRequest): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Product>(res);
	},

	async get(id: number | string): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}`, { cache: "no-store" });
		return handleJsonResponse<Product>(res);
	},

	async update(id: number | string, payload: UpdateProductRequest): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Product>(res);
	},

	async delete(id: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	},

	async activate(id: number | string): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}/activate`, {
			method: "POST"
		});
		return handleJsonResponse<Product>(res);
	},

	async deactivate(id: number | string): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}/deactivate`, {
			method: "POST"
		});
		return handleJsonResponse<Product>(res);
	},

	// Interest Rates
	async getInterestRates(id: number | string): Promise<ProductInterestRate[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates`, { cache: "no-store" });
		return handleJsonResponse<ProductInterestRate[]>(res);
	},

	async addInterestRate(id: number | string, payload: CreateProductInterestRateRequest): Promise<ProductInterestRate> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductInterestRate>(res);
	},

	async updateInterestRate(id: number | string, rateId: number | string, payload: CreateProductInterestRateRequest): Promise<ProductInterestRate> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates/${rateId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductInterestRate>(res);
	},

	async deleteInterestRate(id: number | string, rateId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates/${rateId}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	},

	// Fees
	async getFees(id: number | string): Promise<ProductFee[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/fees`, { cache: "no-store" });
		return handleJsonResponse<ProductFee[]>(res);
	},

	async addFee(id: number | string, payload: CreateProductFeeRequest): Promise<ProductFee> {
		const res = await fetch(`${API_BASE}/api/products/${id}/fees`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductFee>(res);
	},

	async deleteFee(id: number | string, feeId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/fees/${feeId}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	},

	// Limits
	async getLimits(id: number | string): Promise<ProductLimit[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/limits`, { cache: "no-store" });
		return handleJsonResponse<ProductLimit[]>(res);
	},

	async addLimit(id: number | string, payload: CreateProductLimitRequest): Promise<ProductLimit> {
		const res = await fetch(`${API_BASE}/api/products/${id}/limits`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductLimit>(res);
	},

	async deleteLimit(id: number | string, limitId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/limits/${limitId}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	},

	// Periods
	async getPeriods(id: number | string): Promise<ProductPeriod[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/periods`, { cache: "no-store" });
		return handleJsonResponse<ProductPeriod[]>(res);
	},

	async addPeriod(id: number | string, payload: CreateProductPeriodRequest): Promise<ProductPeriod> {
		const res = await fetch(`${API_BASE}/api/products/${id}/periods`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPeriod>(res);
	},

	async deletePeriod(id: number | string, periodId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/periods/${periodId}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	},

	// Penalties
	async getPenalties(id: number | string): Promise<ProductPenalty[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/penalties`, { cache: "no-store" });
		return handleJsonResponse<ProductPenalty[]>(res);
	},

	async addPenalty(id: number | string, payload: CreateProductPenaltyRequest): Promise<ProductPenalty> {
		const res = await fetch(`${API_BASE}/api/products/${id}/penalties`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPenalty>(res);
	},

	async deletePenalty(id: number | string, penaltyId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/penalties/${penaltyId}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	},

	// Eligibility Rules
	async getEligibilityRules(id: number | string): Promise<ProductEligibilityRule[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/eligibility-rules`, { cache: "no-store" });
		return handleJsonResponse<ProductEligibilityRule[]>(res);
	},

	async addEligibilityRule(id: number | string, payload: CreateProductEligibilityRuleRequest): Promise<ProductEligibilityRule> {
		const res = await fetch(`${API_BASE}/api/products/${id}/eligibility-rules`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductEligibilityRule>(res);
	},

	async deleteEligibilityRule(id: number | string, ruleId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/eligibility-rules/${ruleId}`, {
			method: "DELETE"
		});
		await handleJsonResponse(res);
	}
};

export const accountsApi = {
	async list(params?: { clientId?: number }): Promise<Account[]> {
		const usp = new URLSearchParams();
		if (params?.clientId) usp.set("clientId", String(params.clientId));
		const query = usp.toString();
		const res = await fetch(`${API_BASE}/api/accounts${query ? `?${query}` : ""}`, { cache: "no-store" });
		return handleJsonResponse<Account[]>(res);
	},

	async get(id: number | string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}`, { cache: "no-store" });
		return handleJsonResponse<Account>(res);
	},

	async getByAccountNumber(accountNumber: string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/by-number/${encodeURIComponent(accountNumber)}`, { cache: "no-store" });
		return handleJsonResponse<Account>(res);
	},

	async getClientAccounts(clientId: number | string): Promise<Account[]> {
		const res = await fetch(`${API_BASE}/api/accounts/clients/${clientId}/accounts`, { cache: "no-store" });
		return handleJsonResponse<Account[]>(res);
	},

	async countClientAccounts(clientId: number | string): Promise<number> {
		const res = await fetch(`${API_BASE}/api/accounts/clients/${clientId}/count`, { cache: "no-store" });
		return handleJsonResponse<number>(res);
	},

	async openProduct(clientId: number | string, payload: OpenProductRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/clients/${clientId}/open-product`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Account>(res);
	},

	async close(id: number | string, payload: CloseAccountRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/close`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Account>(res);
	},

	async freeze(id: number | string, payload?: FreezeAccountRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/freeze`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: payload ? JSON.stringify(payload) : undefined
		});
		return handleJsonResponse<Account>(res);
	},

	async unfreeze(id: number | string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/unfreeze`, {
			method: "POST"
		});
		return handleJsonResponse<Account>(res);
	},

	async suspend(id: number | string, payload?: SuspendAccountRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/suspend`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: payload ? JSON.stringify(payload) : undefined
		});
		return handleJsonResponse<Account>(res);
	},

	async unsuspend(id: number | string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/unsuspend`, {
			method: "POST"
		});
		return handleJsonResponse<Account>(res);
	}
};


