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
	SuspendAccountRequest,
	User,
	Role,
	Permission,
	AuditEvent,
	LoginRequest,
	RefreshTokenRequest,
	LoginResponse,
	CreateUserRequest,
	UpdateUserRequest,
	CreateRoleRequest,
	UpdateRoleRequest,
	CreatePermissionRequest,
	AssignRoleRequest,
	AssignPermissionsRequest,
	UserStatus
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
		const res = await fetch(`${API_BASE}/api/customers`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Customer[]>(res);
	},

	async create(payload: CreateCustomerRequest): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Customer>(res);
	},

	async get(id: number | string): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Customer>(res);
	},

	async update(id: number | string, payload: Partial<CreateCustomerRequest>): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Customer>(res);
	},

	async getAddresses(id: number | string): Promise<Address[]> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/addresses`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Address[]>(res);
	},

	async addAddress(id: number | string, payload: AddAddressRequest): Promise<void> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/addresses`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async updateAddress(id: number | string, addressId: number | string, payload: AddAddressRequest): Promise<void> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/addresses/${addressId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async getDocuments(id: number | string): Promise<Document[]> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/documents`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Document[]>(res);
	},

	async uploadDocument(id: number | string, type: DocumentType, file: File): Promise<Document> {
		const form = new FormData();
		form.append("file", file);
		const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
		const headers: HeadersInit = {};
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}
		const res = await fetch(`${API_BASE}/api/customers/${id}/documents?type=${encodeURIComponent(type)}`, {
			method: "POST",
			headers: headers,
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
			method: "PUT",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Document>(res);
	},

	async submitKyc(id: number | string): Promise<Customer> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/kyc/submit`, {
			method: "POST",
			headers: getAuthHeaders()
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
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Customer>(res);
	},

	async rejectKyc(id: number | string, rejectionReason?: string): Promise<Customer> {
		const usp = new URLSearchParams();
		if (rejectionReason) {
			usp.set("rejectionReason", rejectionReason);
		}
		const res = await fetch(`${API_BASE}/api/customers/${id}/kyc/reject?${usp.toString()}`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Customer>(res);
	},

	async getRelatedPersons(id: number | string): Promise<RelatedPerson[]> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/related-persons`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<RelatedPerson[]>(res);
	},

	async addRelatedPerson(id: number | string, payload: AddRelatedPersonRequest): Promise<RelatedPerson> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/related-persons`, {
			method: "POST",
			headers: getAuthHeaders(),
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
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<RelatedPerson>(res);
	},

	async deleteRelatedPerson(id: number | string, relatedPersonId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/customers/${id}/related-persons/${relatedPersonId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
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
		const res = await fetch(`${API_BASE}/api/products${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Product[]>(res);
	},

	async create(payload: CreateProductRequest): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Product>(res);
	},

	async get(id: number | string): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Product>(res);
	},

	async update(id: number | string, payload: UpdateProductRequest): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Product>(res);
	},

	async delete(id: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	async activate(id: number | string): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}/activate`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Product>(res);
	},

	async deactivate(id: number | string): Promise<Product> {
		const res = await fetch(`${API_BASE}/api/products/${id}/deactivate`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Product>(res);
	},

	// Interest Rates
	async getInterestRates(id: number | string): Promise<ProductInterestRate[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductInterestRate[]>(res);
	},

	async addInterestRate(id: number | string, payload: CreateProductInterestRateRequest): Promise<ProductInterestRate> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductInterestRate>(res);
	},

	async updateInterestRate(id: number | string, rateId: number | string, payload: CreateProductInterestRateRequest): Promise<ProductInterestRate> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates/${rateId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductInterestRate>(res);
	},

	async deleteInterestRate(id: number | string, rateId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/interest-rates/${rateId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Fees
	async getFees(id: number | string): Promise<ProductFee[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/fees`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductFee[]>(res);
	},

	async addFee(id: number | string, payload: CreateProductFeeRequest): Promise<ProductFee> {
		const res = await fetch(`${API_BASE}/api/products/${id}/fees`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductFee>(res);
	},

	async updateFee(id: number | string, feeId: number | string, payload: CreateProductFeeRequest): Promise<ProductFee> {
		const res = await fetch(`${API_BASE}/api/products/${id}/fees/${feeId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductFee>(res);
	},

	async deleteFee(id: number | string, feeId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/fees/${feeId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Limits
	async getLimits(id: number | string): Promise<ProductLimit[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/limits`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductLimit[]>(res);
	},

	async addLimit(id: number | string, payload: CreateProductLimitRequest): Promise<ProductLimit> {
		const res = await fetch(`${API_BASE}/api/products/${id}/limits`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductLimit>(res);
	},

	async updateLimit(id: number | string, limitId: number | string, payload: CreateProductLimitRequest): Promise<ProductLimit> {
		const res = await fetch(`${API_BASE}/api/products/${id}/limits/${limitId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductLimit>(res);
	},

	async deleteLimit(id: number | string, limitId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/limits/${limitId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Periods
	async getPeriods(id: number | string): Promise<ProductPeriod[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/periods`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductPeriod[]>(res);
	},

	async addPeriod(id: number | string, payload: CreateProductPeriodRequest): Promise<ProductPeriod> {
		const res = await fetch(`${API_BASE}/api/products/${id}/periods`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPeriod>(res);
	},

	async updatePeriod(id: number | string, periodId: number | string, payload: CreateProductPeriodRequest): Promise<ProductPeriod> {
		const res = await fetch(`${API_BASE}/api/products/${id}/periods/${periodId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPeriod>(res);
	},

	async deletePeriod(id: number | string, periodId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/periods/${periodId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Penalties
	async getPenalties(id: number | string): Promise<ProductPenalty[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/penalties`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductPenalty[]>(res);
	},

	async addPenalty(id: number | string, payload: CreateProductPenaltyRequest): Promise<ProductPenalty> {
		const res = await fetch(`${API_BASE}/api/products/${id}/penalties`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPenalty>(res);
	},

	async updatePenalty(id: number | string, penaltyId: number | string, payload: CreateProductPenaltyRequest): Promise<ProductPenalty> {
		const res = await fetch(`${API_BASE}/api/products/${id}/penalties/${penaltyId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPenalty>(res);
	},

	async deletePenalty(id: number | string, penaltyId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/penalties/${penaltyId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Eligibility Rules
	async getEligibilityRules(id: number | string): Promise<ProductEligibilityRule[]> {
		const res = await fetch(`${API_BASE}/api/products/${id}/eligibility-rules`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductEligibilityRule[]>(res);
	},

	async addEligibilityRule(id: number | string, payload: CreateProductEligibilityRuleRequest): Promise<ProductEligibilityRule> {
		const res = await fetch(`${API_BASE}/api/products/${id}/eligibility-rules`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductEligibilityRule>(res);
	},

	async updateEligibilityRule(id: number | string, ruleId: number | string, payload: CreateProductEligibilityRuleRequest): Promise<ProductEligibilityRule> {
		const res = await fetch(`${API_BASE}/api/products/${id}/eligibility-rules/${ruleId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductEligibilityRule>(res);
	},

	async deleteEligibilityRule(id: number | string, ruleId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/products/${id}/eligibility-rules/${ruleId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const accountsApi = {
	async list(params?: { clientId?: number }): Promise<Account[]> {
		const usp = new URLSearchParams();
		if (params?.clientId) usp.set("clientId", String(params.clientId));
		const query = usp.toString();
		const res = await fetch(`${API_BASE}/api/accounts${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account[]>(res);
	},

	async get(id: number | string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account>(res);
	},

	async getByAccountNumber(accountNumber: string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/by-number/${encodeURIComponent(accountNumber)}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account>(res);
	},

	async getClientAccounts(clientId: number | string): Promise<Account[]> {
		const res = await fetch(`${API_BASE}/api/accounts/clients/${clientId}/accounts`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account[]>(res);
	},

	async countClientAccounts(clientId: number | string): Promise<number> {
		const res = await fetch(`${API_BASE}/api/accounts/clients/${clientId}/count`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<number>(res);
	},

	async openProduct(clientId: number | string, payload: OpenProductRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/clients/${clientId}/open-product`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Account>(res);
	},

	async close(id: number | string, payload: CloseAccountRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/close`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Account>(res);
	},

	async freeze(id: number | string, payload?: FreezeAccountRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/freeze`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: payload ? JSON.stringify(payload) : undefined
		});
		return handleJsonResponse<Account>(res);
	},

	async unfreeze(id: number | string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/unfreeze`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Account>(res);
	},

	async suspend(id: number | string, payload?: SuspendAccountRequest): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/suspend`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: payload ? JSON.stringify(payload) : undefined
		});
		return handleJsonResponse<Account>(res);
	},

	async unsuspend(id: number | string): Promise<Account> {
		const res = await fetch(`${API_BASE}/api/accounts/${id}/unsuspend`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Account>(res);
	}
};

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
	const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
	const headers: HeadersInit = { "Content-Type": "application/json" };
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}
	return headers;
}

export const authApi = {
	async login(payload: LoginRequest): Promise<LoginResponse> {
		const res = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		const response = await handleJsonResponse<LoginResponse>(res);
		// Stocker les tokens
		if (typeof window !== 'undefined' && response) {
			localStorage.setItem('accessToken', response.accessToken);
			localStorage.setItem('refreshToken', response.refreshToken);
		}
		return response;
	},

	async refreshToken(payload: RefreshTokenRequest): Promise<LoginResponse> {
		const res = await fetch(`${API_BASE}/api/auth/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		const response = await handleJsonResponse<LoginResponse>(res);
		// Mettre à jour le token
		if (typeof window !== 'undefined' && response) {
			localStorage.setItem('accessToken', response.accessToken);
		}
		return response;
	},

	async logout(payload: RefreshTokenRequest): Promise<void> {
		const res = await fetch(`${API_BASE}/api/auth/logout`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
		// Supprimer les tokens
		if (typeof window !== 'undefined') {
			localStorage.removeItem('accessToken');
			localStorage.removeItem('refreshToken');
		}
	},

	getAccessToken(): string | null {
		if (typeof window === 'undefined') return null;
		return localStorage.getItem('accessToken');
	},

	getRefreshToken(): string | null {
		if (typeof window === 'undefined') return null;
		return localStorage.getItem('refreshToken');
	},

	isAuthenticated(): boolean {
		return this.getAccessToken() !== null;
	}
};

export const usersApi = {
	async list(params?: { status?: UserStatus }): Promise<User[]> {
		const usp = new URLSearchParams();
		if (params?.status) usp.set("status", params.status);
		const query = usp.toString();
		const res = await fetch(`${API_BASE}/api/users${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<User[]>(res);
	},

	async get(id: number | string): Promise<User> {
		const res = await fetch(`${API_BASE}/api/users/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<User>(res);
	},

	async create(payload: CreateUserRequest): Promise<User> {
		const res = await fetch(`${API_BASE}/api/users`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<User>(res);
	},

	async update(id: number | string, payload: UpdateUserRequest): Promise<User> {
		const res = await fetch(`${API_BASE}/api/users/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<User>(res);
	},

	async delete(id: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/users/${id}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	async assignRole(userId: number | string, payload: AssignRoleRequest): Promise<void> {
		const res = await fetch(`${API_BASE}/api/users/${userId}/roles`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async revokeRole(userId: number | string, roleId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/users/${userId}/roles/${roleId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const rolesApi = {
	async list(): Promise<Role[]> {
		const res = await fetch(`${API_BASE}/api/roles`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Role[]>(res);
	},

	async get(id: number | string): Promise<Role> {
		const res = await fetch(`${API_BASE}/api/roles/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Role>(res);
	},

	async create(payload: CreateRoleRequest): Promise<Role> {
		const res = await fetch(`${API_BASE}/api/roles`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Role>(res);
	},

	async update(id: number | string, payload: UpdateRoleRequest): Promise<Role> {
		const res = await fetch(`${API_BASE}/api/roles/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Role>(res);
	},

	async assignPermissions(roleId: number | string, payload: AssignPermissionsRequest): Promise<void> {
		const res = await fetch(`${API_BASE}/api/roles/${roleId}/permissions`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async revokePermission(roleId: number | string, permissionId: number | string): Promise<void> {
		const res = await fetch(`${API_BASE}/api/roles/${roleId}/permissions/${permissionId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const permissionsApi = {
	async list(params?: { resource?: string }): Promise<Permission[]> {
		const usp = new URLSearchParams();
		if (params?.resource) usp.set("resource", params.resource);
		const query = usp.toString();
		const res = await fetch(`${API_BASE}/api/permissions${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Permission[]>(res);
	},

	async create(payload: CreatePermissionRequest): Promise<Permission> {
		const res = await fetch(`${API_BASE}/api/permissions`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Permission>(res);
	}
};

export const auditApi = {
	async getEvents(params?: {
		userId?: number;
		action?: string;
		resourceType?: string;
		fromDate?: string;
		toDate?: string;
	}): Promise<AuditEvent[]> {
		const usp = new URLSearchParams();
		if (params?.userId) usp.set("userId", String(params.userId));
		if (params?.action) usp.set("action", params.action);
		if (params?.resourceType) usp.set("resourceType", params.resourceType);
		if (params?.fromDate) usp.set("fromDate", params.fromDate);
		if (params?.toDate) usp.set("toDate", params.toDate);
		const query = usp.toString();
		const res = await fetch(`${API_BASE}/api/audit/events${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<AuditEvent[]>(res);
	}
};


