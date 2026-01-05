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
	ProductGLMapping,
	CreateProductGLMappingRequest,
	UpdateProductGLMappingRequest,
	Account,
	JournalBatch,
	CreateJournalBatchRequest,
	LedgerEntry,
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
	UserStatus,
	ChartOfAccount,
	CreateChartOfAccountRequest,
	UpdateChartOfAccountRequest,
	LedgerAccount,
	CreateLedgerAccountRequest,
	UpdateLedgerAccountRequest,
	AccountType,
	LedgerAccountStatus,
	JournalBatchStatus,
	Transaction,
	TransactionType,
	TransactionStatus,
	CreateTransactionRequest,
	ReverseTransactionRequest,
	TransactionEntry,
	Transfer,
	TransferStatus,
	CreateTransferRequest,
	CancelTransferRequest,
	Hold,
	HoldStatus,
	CreateHoldRequest,
	Closure,
	ClosureType,
	ClosureStatus,
	CloseDayRequest,
	CloseMonthRequest,
	ClosureValidationResponse
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

// Variable pour éviter les boucles infinies de refresh
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Fonction pour rafraîchir le token automatiquement
async function refreshAccessToken(): Promise<string | null> {
	// Si un refresh est déjà en cours, attendre qu'il se termine
	if (isRefreshing && refreshPromise) {
		return refreshPromise;
	}

	isRefreshing = true;
	refreshPromise = (async () => {
		try {
			const refreshToken = typeof window !== 'undefined' 
				? localStorage.getItem('refreshToken') 
				: null;
			
			if (!refreshToken) {
				return null;
			}

			const res = await fetch(`${API_BASE}/api/auth/refresh`, {
				method: "POST",
				headers: { 
					"Content-Type": "application/json",
					...getLanguageHeader()
				},
				body: JSON.stringify({ refreshToken })
			});

			if (res.ok) {
				const response = await res.json() as LoginResponse;
				if (response.accessToken && typeof window !== 'undefined') {
					localStorage.setItem('accessToken', response.accessToken);
					if (response.refreshToken) {
						localStorage.setItem('refreshToken', response.refreshToken);
					}
					return response.accessToken;
				}
			}
			return null;
		} catch (error) {
			console.error("Erreur lors du refresh du token:", error);
			return null;
		} finally {
			isRefreshing = false;
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

// Wrapper pour fetch qui gère automatiquement le refresh du token
async function fetchWithAutoRefresh(
	url: string | URL | Request,
	options: RequestInit = {}
): Promise<Response> {
	// Faire la requête initiale
	let response = await fetch(url, options);

	// Si on reçoit une erreur 401, essayer de rafraîchir le token
	if (response.status === 401 && !url.toString().includes('/api/auth/')) {
		const newToken = await refreshAccessToken();
		
		if (newToken) {
			// Réessayer la requête avec le nouveau token
			const newHeaders = new Headers(options.headers);
			newHeaders.set('Authorization', `Bearer ${newToken}`);
			options.headers = newHeaders;
			response = await fetch(url, options);
		} else {
			// Si le refresh a échoué, supprimer les tokens et rediriger
			if (typeof window !== 'undefined') {
				localStorage.removeItem('accessToken');
				localStorage.removeItem('refreshToken');
				const event = new CustomEvent("show-toast", {
					detail: { message: "Session expirée. Veuillez vous reconnecter.", type: "error" }
				});
				window.dispatchEvent(event);
				if (window.location.pathname !== '/login') {
					window.location.href = '/login?error=session_expired';
				}
			}
		}
	}

	return response;
}

async function handleJsonResponse<T>(res: Response, silent: boolean = false): Promise<T> {
	// Gérer les réponses vides (204 No Content, etc.) avant de vérifier res.ok
	if (res.status === 204 || (res.status >= 200 && res.status < 300 && !res.headers.get('content-type')?.includes('application/json'))) {
		return undefined as T;
	}

	// Lire le texte une seule fois au début
	let text: string = "";
	try {
		text = await res.text();
	} catch {
		// Si on ne peut pas lire le texte, continuer avec une chaîne vide
	}

	if (!res.ok) {
		// Gérer les erreurs d'authentification (401 Unauthorized)
		// Note: Le refresh automatique est géré par fetchWithAutoRefresh
		// Si on arrive ici avec un 401, c'est que le refresh a échoué
		if (res.status === 401) {
			// Le refresh automatique a déjà été tenté et a échoué
			// Les tokens ont déjà été supprimés et la redirection faite
			throw new Error("Authentification requise. Veuillez vous connecter.");
		}

		// Gérer les erreurs de conflit (409 Conflict)
		if (res.status === 409) {
			let errorMessage = "Un conflit s'est produit. Cette ressource existe déjà.";
			if (text) {
				try {
					const json = JSON.parse(text);
					if (json.message) {
						errorMessage = json.message;
					} else if (json.error) {
						errorMessage = json.error;
					} else {
						errorMessage = text;
					}
				} catch {
					errorMessage = text || errorMessage;
				}
			}
			// Afficher un toast
			if (typeof window !== "undefined") {
				const event = new CustomEvent("show-toast", {
					detail: { message: errorMessage, type: "error" }
				});
				window.dispatchEvent(event);
			}
			const error = new Error(errorMessage);
			(error as any).status = 409;
			throw error;
		}

		// Gérer les autres erreurs
		let errorMessage = `HTTP ${res.status}`;
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
		
		// Afficher un toast au lieu d'une erreur console (sauf si silent = true)
		if (!silent && typeof window !== "undefined") {
			const event = new CustomEvent("show-toast", {
				detail: { message: errorMessage, type: "error" }
			});
			window.dispatchEvent(event);
		}
		
		throw new Error(errorMessage);
	}

	// Si la réponse est OK, parser le JSON
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
	async list(params?: {
		type?: "PERSON" | "BUSINESS";
		status?: "DRAFT" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED";
		search?: string;
		page?: number;
		size?: number;
	}): Promise<{ content: Customer[]; totalElements: number; totalPages: number; number: number; size: number }> {
		const usp = new URLSearchParams();
		if (params?.type) usp.set("type", params.type);
		if (params?.status) usp.set("status", params.status);
		if (params?.search) usp.set("search", params.search);
		if (params?.page !== undefined) usp.set("page", String(params.page));
		if (params?.size !== undefined) usp.set("size", String(params.size));
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{ content: Customer[]; totalElements: number; totalPages: number; number: number; size: number }>(res);
	},

	async create(payload: CreateCustomerRequest): Promise<Customer> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Customer>(res);
	},

	async get(id: number | string): Promise<Customer> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Customer>(res);
	},

	async update(id: number | string, payload: Partial<CreateCustomerRequest>): Promise<Customer> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Customer>(res);
	},

	async getAddresses(id: number | string): Promise<Address[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/addresses`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Address[]>(res);
	},

	async addAddress(id: number | string, payload: AddAddressRequest): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/addresses`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async updateAddress(id: number | string, addressId: number | string, payload: AddAddressRequest): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/addresses/${addressId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async getDocuments(id: number | string): Promise<Document[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/documents`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Document[]>(res);
	},

	async uploadDocument(id: number | string, type: DocumentType, file: File): Promise<Document> {
		const form = new FormData();
		form.append("file", file);
		const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
		const headers: HeadersInit = {
			"X-Channel": "OPS", // Canal Back-Office pour core-dashboard
			...getLanguageHeader()
		};
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/documents?type=${encodeURIComponent(type)}`, {
			method: "POST",
			headers: headers,
			body: form
		});
		return handleJsonResponse<Document>(res);
	},

	getDocumentUrl(id: number | string, documentId: number | string): string {
		return `${API_BASE}/api/ops/customers/${id}/documents/${documentId}/download`;
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
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/documents/${documentId}/review?${usp.toString()}`, {
			method: "PUT",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Document>(res);
	},

	async submitKyc(id: number | string): Promise<Customer> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/kyc/submit`, {
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
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/kyc/verify?${usp.toString()}`, {
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
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/kyc/reject?${usp.toString()}`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Customer>(res);
	},

	async getRelatedPersons(id: number | string): Promise<RelatedPerson[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/related-persons`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<RelatedPerson[]>(res);
	},

	async addRelatedPerson(id: number | string, payload: AddRelatedPersonRequest): Promise<RelatedPerson> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/related-persons`, {
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
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/related-persons/${relatedPersonId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<RelatedPerson>(res);
	},

	async deleteRelatedPerson(id: number | string, relatedPersonId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/customers/${id}/related-persons/${relatedPersonId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const productsApi = {
	async list(params?: {
		category?: ProductCategory;
		status?: ProductStatus;
		page?: number;
		size?: number;
	}): Promise<{ content: Product[]; totalElements: number; totalPages: number; number: number; size: number }> {
		const usp = new URLSearchParams();
		if (params?.category) usp.set("category", params.category);
		if (params?.status) usp.set("status", params.status);
		if (params?.page !== undefined) usp.set("page", String(params.page));
		if (params?.size !== undefined) usp.set("size", String(params.size));
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{ content: Product[]; totalElements: number; totalPages: number; number: number; size: number }>(res);
	},

	async create(payload: CreateProductRequest): Promise<Product> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Product>(res);
	},

	async get(id: number | string): Promise<Product> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Product>(res);
	},

	async update(id: number | string, payload: UpdateProductRequest): Promise<Product> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Product>(res);
	},

	async delete(id: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	async activate(id: number | string): Promise<Product> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/activate`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Product>(res);
	},

	async deactivate(id: number | string): Promise<Product> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/deactivate`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Product>(res);
	},

	// Interest Rates
	async getInterestRates(id: number | string): Promise<ProductInterestRate[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/interest-rates`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductInterestRate[]>(res);
	},

	async addInterestRate(id: number | string, payload: CreateProductInterestRateRequest): Promise<ProductInterestRate> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/interest-rates`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductInterestRate>(res);
	},

	async updateInterestRate(id: number | string, rateId: number | string, payload: CreateProductInterestRateRequest): Promise<ProductInterestRate> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/interest-rates/${rateId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductInterestRate>(res);
	},

	async deleteInterestRate(id: number | string, rateId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/interest-rates/${rateId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Fees
	async getFees(id: number | string): Promise<ProductFee[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/fees`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductFee[]>(res);
	},

	async addFee(id: number | string, payload: CreateProductFeeRequest): Promise<ProductFee> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/fees`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductFee>(res);
	},

	async updateFee(id: number | string, feeId: number | string, payload: CreateProductFeeRequest): Promise<ProductFee> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/fees/${feeId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductFee>(res);
	},

	async deleteFee(id: number | string, feeId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/fees/${feeId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Limits
	async getLimits(id: number | string): Promise<ProductLimit[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/limits`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductLimit[]>(res);
	},

	async addLimit(id: number | string, payload: CreateProductLimitRequest): Promise<ProductLimit> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/limits`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductLimit>(res);
	},

	async updateLimit(id: number | string, limitId: number | string, payload: CreateProductLimitRequest): Promise<ProductLimit> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/limits/${limitId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductLimit>(res);
	},

	async deleteLimit(id: number | string, limitId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/limits/${limitId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Periods
	async getPeriods(id: number | string): Promise<ProductPeriod[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/periods`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductPeriod[]>(res);
	},

	async addPeriod(id: number | string, payload: CreateProductPeriodRequest): Promise<ProductPeriod> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/periods`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPeriod>(res);
	},

	async updatePeriod(id: number | string, periodId: number | string, payload: CreateProductPeriodRequest): Promise<ProductPeriod> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/periods/${periodId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPeriod>(res);
	},

	async deletePeriod(id: number | string, periodId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/periods/${periodId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Penalties
	async getPenalties(id: number | string): Promise<ProductPenalty[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/penalties`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductPenalty[]>(res);
	},

	async addPenalty(id: number | string, payload: CreateProductPenaltyRequest): Promise<ProductPenalty> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/penalties`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPenalty>(res);
	},

	async updatePenalty(id: number | string, penaltyId: number | string, payload: CreateProductPenaltyRequest): Promise<ProductPenalty> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/penalties/${penaltyId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductPenalty>(res);
	},

	async deletePenalty(id: number | string, penaltyId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/penalties/${penaltyId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	// Eligibility Rules
	async getEligibilityRules(id: number | string): Promise<ProductEligibilityRule[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/eligibility-rules`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductEligibilityRule[]>(res);
	},

	async addEligibilityRule(id: number | string, payload: CreateProductEligibilityRuleRequest): Promise<ProductEligibilityRule> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/eligibility-rules`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductEligibilityRule>(res);
	},

	async updateEligibilityRule(id: number | string, ruleId: number | string, payload: CreateProductEligibilityRuleRequest): Promise<ProductEligibilityRule> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/eligibility-rules/${ruleId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductEligibilityRule>(res);
	},

	async deleteEligibilityRule(id: number | string, ruleId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${id}/eligibility-rules/${ruleId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const productGLMappingsApi = {
	async list(productId: number | string): Promise<ProductGLMapping[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${productId}/gl-mappings`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductGLMapping[]>(res);
	},

	async get(productId: number | string, mappingId: number | string): Promise<ProductGLMapping> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${productId}/gl-mappings/${mappingId}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ProductGLMapping>(res);
	},

	async create(productId: number | string, payload: CreateProductGLMappingRequest): Promise<ProductGLMapping> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${productId}/gl-mappings`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductGLMapping>(res);
	},

	async update(productId: number | string, mappingId: number | string, payload: UpdateProductGLMappingRequest): Promise<ProductGLMapping> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${productId}/gl-mappings/${mappingId}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ProductGLMapping>(res);
	},

	async delete(productId: number | string, mappingId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/products/${productId}/gl-mappings/${mappingId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const accountsApi = {
	async list(params?: {
		clientId?: number;
		page?: number;
		size?: number;
	}): Promise<{ content: Account[]; totalElements: number; totalPages: number; number: number; size: number }> {
		const usp = new URLSearchParams();
		if (params?.clientId) usp.set("clientId", String(params.clientId));
		if (params?.page !== undefined) usp.set("page", String(params.page));
		if (params?.size !== undefined) usp.set("size", String(params.size));
		const query = usp.toString();
		const url = `${API_BASE}/api/ops/accounts${query ? `?${query}` : ""}`;
		const res = await fetchWithAutoRefresh(url, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{ content: Account[]; totalElements: number; totalPages: number; number: number; size: number }>(res);
	},

	async get(id: number | string): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account>(res);
	},

	async getByAccountNumber(accountNumber: string): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/by-number/${encodeURIComponent(accountNumber)}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account>(res);
	},

	async getClientAccounts(clientId: number | string): Promise<Account[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/clients/${clientId}/accounts`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account[]>(res);
	},

	async countClientAccounts(clientId: number | string): Promise<number> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/clients/${clientId}/count`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<number>(res);
	},

	async openProduct(clientId: number | string, payload: OpenProductRequest): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/clients/${clientId}/open-product`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Account>(res);
	},

	async close(id: number | string, payload: CloseAccountRequest): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${id}/close`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Account>(res);
	},

	async freeze(id: number | string, payload?: FreezeAccountRequest): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${id}/freeze`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: payload ? JSON.stringify(payload) : undefined
		});
		return handleJsonResponse<Account>(res);
	},

	async unfreeze(id: number | string): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${id}/unfreeze`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Account>(res);
	},

	async suspend(id: number | string, payload?: SuspendAccountRequest): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${id}/suspend`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: payload ? JSON.stringify(payload) : undefined
		});
		return handleJsonResponse<Account>(res);
	},

	async unsuspend(id: number | string): Promise<Account> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${id}/unsuspend`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Account>(res);
	}
};

// Helper function to get language header
function getLanguageHeader(): Record<string, string> {
	if (typeof window === 'undefined') {
		return {};
	}
	// Récupérer la langue depuis localStorage (stockée par i18next)
	const language = localStorage.getItem('i18nextLng') || 'fr'; // Par défaut 'fr' si non défini
	// Normaliser le format (enlever les variantes comme 'fr-FR' -> 'fr')
	const langCode = language.split('-')[0].toLowerCase();
	return { "X-Language": langCode };
}

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
	const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
	const headers: HeadersInit = { 
		"Content-Type": "application/json",
		"X-Channel": "OPS", // Canal Back-Office pour core-dashboard
		...getLanguageHeader()
	};
	
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	} else if (typeof window !== 'undefined') {
		// Log uniquement en développement pour déboguer
		if (process.env.NODE_ENV === 'development') {
			console.warn("Aucun token d'accès trouvé dans localStorage. L'utilisateur doit se connecter.");
		}
	}
	return headers;
}

export const authApi = {
	async login(payload: LoginRequest): Promise<LoginResponse> {
		const res = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				...getLanguageHeader()
			},
			body: JSON.stringify(payload)
		});
		const response = await handleJsonResponse<LoginResponse>(res);
		// Stocker les tokens
		if (typeof window !== 'undefined' && response && response.accessToken) {
			localStorage.setItem('accessToken', response.accessToken);
			if (response.refreshToken) {
				localStorage.setItem('refreshToken', response.refreshToken);
			}
		}
		return response;
	},

	async refreshToken(payload: RefreshTokenRequest): Promise<LoginResponse> {
		const res = await fetch(`${API_BASE}/api/auth/refresh`, {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				...getLanguageHeader()
			},
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
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/users${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<User[]>(res);
	},

	async get(id: number | string): Promise<User> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/users/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<User>(res);
	},

	async create(payload: CreateUserRequest): Promise<User> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/users`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<User>(res);
	},

	async update(id: number | string, payload: UpdateUserRequest): Promise<User> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/users/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<User>(res);
	},

	async delete(id: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/users/${id}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	async assignRole(userId: number | string, payload: AssignRoleRequest): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/users/${userId}/roles`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async revokeRole(userId: number | string, roleId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/users/${userId}/roles/${roleId}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const rolesApi = {
	async list(): Promise<Role[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/roles`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Role[]>(res);
	},

	async get(id: number | string): Promise<Role> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/roles/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Role>(res);
	},

	async create(payload: CreateRoleRequest): Promise<Role> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/roles`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Role>(res);
	},

	async update(id: number | string, payload: UpdateRoleRequest): Promise<Role> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/roles/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Role>(res);
	},

	async assignPermissions(roleId: number | string, payload: AssignPermissionsRequest): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/roles/${roleId}/permissions`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		await handleJsonResponse(res);
	},

	async revokePermission(roleId: number | string, permissionId: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/roles/${roleId}/permissions/${permissionId}`, {
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
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/permissions${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Permission[]>(res);
	},

	async create(payload: CreatePermissionRequest): Promise<Permission> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/permissions`, {
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
		page?: number;
		size?: number;
	}): Promise<{ content: AuditEvent[]; totalElements: number; totalPages: number; number: number; size: number }> {
		const usp = new URLSearchParams();
		if (params?.userId) usp.set("userId", String(params.userId));
		if (params?.action) usp.set("action", params.action);
		if (params?.resourceType) usp.set("resourceType", params.resourceType);
		if (params?.fromDate) usp.set("fromDate", params.fromDate);
		if (params?.toDate) usp.set("toDate", params.toDate);
		if (params?.page !== undefined) usp.set("page", String(params.page));
		if (params?.size !== undefined) usp.set("size", String(params.size));
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/audit/events${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{ content: AuditEvent[]; totalElements: number; totalPages: number; number: number; size: number }>(res);
	},

	async getEvent(id: number): Promise<AuditEvent> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/audit/events/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<AuditEvent>(res);
	},

	async getStatistics(): Promise<import("@/types").AuditStatisticsResponse> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/audit/statistics`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<import("@/types").AuditStatisticsResponse>(res);
	},

	async getUserActivity(userId: number, params?: {
		fromDate?: string;
		toDate?: string;
	}): Promise<AuditEvent[]> {
		const usp = new URLSearchParams();
		if (params?.fromDate) usp.set("fromDate", params.fromDate);
		if (params?.toDate) usp.set("toDate", params.toDate);
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/audit/users/${userId}/activity${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<AuditEvent[]>(res);
	},

	async getResourceTrace(resourceType: string, resourceId: number): Promise<import("@/types").AuditResourceTraceResponse> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/audit/resources/${encodeURIComponent(resourceType)}/${resourceId}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<import("@/types").AuditResourceTraceResponse>(res);
	},

	async getResourceAccesses(resourceType: string, resourceId: number): Promise<AuditEvent[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/audit/resources/${encodeURIComponent(resourceType)}/${resourceId}/accesses`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<AuditEvent[]>(res);
	},

	async exportEvents(params?: {
		userId?: number;
		action?: string;
		resourceType?: string;
		fromDate?: string;
		toDate?: string;
	}): Promise<Blob> {
		const usp = new URLSearchParams();
		if (params?.userId) usp.set("userId", String(params.userId));
		if (params?.action) usp.set("action", params.action);
		if (params?.resourceType) usp.set("resourceType", params.resourceType);
		if (params?.fromDate) usp.set("fromDate", params.fromDate);
		if (params?.toDate) usp.set("toDate", params.toDate);
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/audit/export${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		if (!res.ok) {
			throw new Error(`Export failed: ${res.statusText}`);
		}
		return res.blob();
	}
};

export const chartOfAccountsApi = {
	async list(params?: { accountType?: AccountType; isActive?: boolean }): Promise<ChartOfAccount[]> {
		const usp = new URLSearchParams();
		if (params?.accountType) usp.set("accountType", params.accountType);
		if (params?.isActive !== undefined) usp.set("isActive", String(params.isActive));
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ChartOfAccount[]>(res);
	},

	async getRootAccounts(): Promise<ChartOfAccount[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts/root`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ChartOfAccount[]>(res);
	},

	async get(id: number | string): Promise<ChartOfAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ChartOfAccount>(res);
	},

	async getByCode(code: string): Promise<ChartOfAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts/by-code/${encodeURIComponent(code)}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ChartOfAccount>(res);
	},

	async getChildren(parentCode: string): Promise<ChartOfAccount[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts/parent/${encodeURIComponent(parentCode)}/children`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ChartOfAccount[]>(res);
	},

	async create(payload: CreateChartOfAccountRequest): Promise<ChartOfAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ChartOfAccount>(res);
	},

	async update(id: number | string, payload: UpdateChartOfAccountRequest): Promise<ChartOfAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<ChartOfAccount>(res);
	},

	async delete(id: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/chart-of-accounts/${id}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	}
};

export const ledgerAccountsApi = {
	async list(params?: { accountType?: AccountType; currency?: string; status?: LedgerAccountStatus }): Promise<LedgerAccount[]> {
		const usp = new URLSearchParams();
		if (params?.accountType) usp.set("accountType", params.accountType);
		if (params?.currency) usp.set("currency", params.currency);
		if (params?.status) usp.set("status", params.status);
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<LedgerAccount[]>(res);
	},

	async get(id: number | string): Promise<LedgerAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<LedgerAccount>(res);
	},

	async getByCode(code: string): Promise<LedgerAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts/by-code/${encodeURIComponent(code)}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<LedgerAccount>(res);
	},

	async create(payload: CreateLedgerAccountRequest): Promise<LedgerAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<LedgerAccount>(res);
	},

	async update(id: number | string, payload: UpdateLedgerAccountRequest): Promise<LedgerAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts/${id}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<LedgerAccount>(res);
	},

	async activate(id: number | string): Promise<LedgerAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts/${id}/activate`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<LedgerAccount>(res);
	},

	async deactivate(id: number | string): Promise<LedgerAccount> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts/${id}/deactivate`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<LedgerAccount>(res);
	},

	async getEntries(id: number | string, params?: { startDate?: string; endDate?: string }): Promise<LedgerEntry[]> {
		const usp = new URLSearchParams();
		if (params?.startDate) usp.set("startDate", params.startDate);
		if (params?.endDate) usp.set("endDate", params.endDate);
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/ledger-accounts/${id}/entries${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<LedgerEntry[]>(res);
	}
};

export const transactionsApi = {
	async list(params?: {
		accountId?: number;
		type?: TransactionType;
		status?: TransactionStatus;
		fromDate?: string;
		toDate?: string;
		page?: number;
		size?: number;
	}): Promise<{ content: Transaction[]; totalElements: number; totalPages: number; number: number; size: number }> {
		const usp = new URLSearchParams();
		if (params?.accountId) usp.set("accountId", String(params.accountId));
		if (params?.type) usp.set("type", params.type);
		if (params?.status) usp.set("status", params.status);
		if (params?.fromDate) usp.set("fromDate", params.fromDate);
		if (params?.toDate) usp.set("toDate", params.toDate);
		if (params?.page !== undefined) usp.set("page", String(params.page));
		if (params?.size !== undefined) usp.set("size", String(params.size));
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{ content: Transaction[]; totalElements: number; totalPages: number; number: number; size: number }>(res);
	},

	async get(id: number | string): Promise<Transaction> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transaction>(res);
	},

	async getByNumber(transactionNumber: string): Promise<Transaction> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/by-number/${encodeURIComponent(transactionNumber)}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transaction>(res);
	},

	async getAccountTransactions(accountId: number | string, params?: { page?: number; size?: number }): Promise<{ content: Transaction[]; totalElements: number; totalPages: number; number: number; size: number }> {
		const usp = new URLSearchParams();
		if (params?.page !== undefined) usp.set("page", String(params.page));
		if (params?.size !== undefined) usp.set("size", String(params.size));
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/accounts/${accountId}/transactions${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{ content: Transaction[]; totalElements: number; totalPages: number; number: number; size: number }>(res);
	},

	async getEntries(id: number | string): Promise<TransactionEntry[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/${id}/entries`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<TransactionEntry[]>(res);
	},

	async create(payload: CreateTransactionRequest, idempotencyKey?: string): Promise<Transaction> {
		const headers = getAuthHeaders();
		if (idempotencyKey) {
			(headers as Record<string, string>)["Idempotency-Key"] = idempotencyKey;
		}
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions`, {
			method: "POST",
			headers: headers,
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Transaction>(res);
	},

	async reverse(id: number | string, payload: ReverseTransactionRequest): Promise<Transaction> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/${id}/reverse`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Transaction>(res);
	}
};

export const transfersApi = {
	async list(params?: {
		fromAccountId?: number;
		toAccountId?: number;
		status?: TransferStatus;
		fromDate?: string;
		toDate?: string;
		page?: number;
		size?: number;
	}): Promise<{ content: Transfer[]; totalElements: number; totalPages: number; number: number; size: number }> {
		const usp = new URLSearchParams();
		if (params?.fromAccountId) usp.set("fromAccountId", String(params.fromAccountId));
		if (params?.toAccountId) usp.set("toAccountId", String(params.toAccountId));
		if (params?.status) usp.set("status", params.status);
		if (params?.fromDate) usp.set("fromDate", params.fromDate);
		if (params?.toDate) usp.set("toDate", params.toDate);
		if (params?.page !== undefined) usp.set("page", String(params.page));
		if (params?.size !== undefined) usp.set("size", String(params.size));
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transfers${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{ content: Transfer[]; totalElements: number; totalPages: number; number: number; size: number }>(res);
	},

	async get(id: number | string): Promise<Transfer> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transfers/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transfer>(res);
	},

	async getByNumber(transferNumber: string): Promise<Transfer> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transfers/by-number/${encodeURIComponent(transferNumber)}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transfer>(res);
	},

	async getAccountTransfers(accountId: number | string): Promise<Transfer[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transfers/accounts/${accountId}/transfers`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transfer[]>(res);
	},

	async create(payload: CreateTransferRequest, idempotencyKey?: string): Promise<Transfer> {
		const headers = getAuthHeaders();
		if (idempotencyKey) {
			(headers as Record<string, string>)["Idempotency-Key"] = idempotencyKey;
		}
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transfers`, {
			method: "POST",
			headers: headers,
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Transfer>(res);
	},

	async cancel(id: number | string, payload: CancelTransferRequest): Promise<Transfer> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transfers/${id}/cancel`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Transfer>(res);
	}
};

export const holdsApi = {
	async get(id: number | string): Promise<Hold> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/holds/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Hold>(res);
	},

	async getAccountHolds(accountId: number | string): Promise<Hold[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/accounts/${accountId}/holds`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Hold[]>(res);
	},

	async create(accountId: number | string, payload: CreateHoldRequest): Promise<Hold> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/accounts/${accountId}/holds`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Hold>(res);
	},

	async release(id: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/holds/${id}`, {
			method: "DELETE",
			headers: getAuthHeaders()
		});
		await handleJsonResponse(res);
	},

	async apply(holdId: number | string, transactionId: number | string): Promise<Hold> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/transactions/holds/${holdId}/apply?transactionId=${transactionId}`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<Hold>(res);
	}
};

export const interestsApi = {
	async calculateInterest(accountId: number | string, periodDays: number = 30): Promise<any> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/interest/calculation?periodDays=${periodDays}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		// Ne pas afficher de toast pour cette erreur car elle est attendue pour les comptes non-ACTIVE
		return handleJsonResponse<any>(res, true);
	},

	async applyInterest(accountId: number | string, payload: { periodDays: number; description?: string; valueDate?: string }): Promise<Transaction> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/interest/apply`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Transaction>(res);
	},

	async getHistory(accountId: number | string, fromDate?: string, toDate?: string, page: number = 0, size: number = 20): Promise<any> {
		const params = new URLSearchParams();
		if (fromDate) params.append("fromDate", fromDate);
		if (toDate) params.append("toDate", toDate);
		params.append("page", page.toString());
		params.append("size", size.toString());
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/interest/history?${params.toString()}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<any>(res);
	},

	async getHistoryList(accountId: number | string, fromDate?: string, toDate?: string): Promise<Transaction[]> {
		const params = new URLSearchParams();
		if (fromDate) params.append("fromDate", fromDate);
		if (toDate) params.append("toDate", toDate);
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/interest/history/list?${params.toString()}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transaction[]>(res);
	}
};

export const feesApi = {
	async getApplicableFees(accountId: number | string): Promise<ProductFee[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/fees/applicable`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		// Ne pas afficher de toast pour cette erreur car elle est attendue pour les comptes non-ACTIVE
		return handleJsonResponse<ProductFee[]>(res, true);
	},

	async calculateFee(accountId: number | string, feeType: string): Promise<any> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/fees/calculation?feeType=${feeType}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<any>(res);
	},

	async applyFee(accountId: number | string, payload: { feeType: string; description?: string; waiveFee?: boolean; waiverReason?: string; valueDate?: string }): Promise<Transaction> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/fees/apply`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Transaction>(res);
	},

	async waiveFee(accountId: number | string, payload: { feeType: string; description?: string; waiverReason: string; valueDate?: string }): Promise<Transaction> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/fees/waive`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Transaction>(res);
	},

	async getHistory(accountId: number | string, fromDate?: string, toDate?: string, page: number = 0, size: number = 20): Promise<any> {
		const params = new URLSearchParams();
		if (fromDate) params.append("fromDate", fromDate);
		if (toDate) params.append("toDate", toDate);
		params.append("page", page.toString());
		params.append("size", size.toString());
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/fees/history?${params.toString()}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<any>(res);
	},

	async getHistoryList(accountId: number | string, fromDate?: string, toDate?: string): Promise<Transaction[]> {
		const params = new URLSearchParams();
		if (fromDate) params.append("fromDate", fromDate);
		if (toDate) params.append("toDate", toDate);
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/accounts/${accountId}/fees/history/list?${params.toString()}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transaction[]>(res);
	}
};

export const dashboardApi = {
	async getStats(): Promise<any> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/dashboard/stats`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<any>(res);
	},

	async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/dashboard/recent-transactions?limit=${limit}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Transaction[]>(res);
	},

	async getRecentAccounts(limit: number = 10): Promise<Account[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/dashboard/recent-accounts?limit=${limit}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Account[]>(res);
	},

	async getTransactionStatsByType(fromDate?: string, toDate?: string): Promise<any> {
		const params = new URLSearchParams();
		if (fromDate) params.append("fromDate", fromDate);
		if (toDate) params.append("toDate", toDate);
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/dashboard/transaction-stats-by-type?${params.toString()}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<any>(res);
	}
};

export const journalBatchesApi = {
	async list(params?: {
		status?: JournalBatchStatus;
		startDate?: string;
		endDate?: string;
		page?: number;
		size?: number;
	}): Promise<{
		content: JournalBatch[];
		totalElements: number;
		totalPages: number;
		number: number;
		size: number;
	}> {
		const usp = new URLSearchParams();
		if (params?.status) usp.set("status", params.status);
		if (params?.startDate) usp.set("startDate", params.startDate);
		if (params?.endDate) usp.set("endDate", params.endDate);
		if (params?.page !== undefined) usp.set("page", params.page.toString());
		if (params?.size !== undefined) usp.set("size", params.size.toString());
		const query = usp.toString();
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/journal-batches${query ? `?${query}` : ""}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<{
			content: JournalBatch[];
			totalElements: number;
			totalPages: number;
			number: number;
			size: number;
		}>(res);
	},

	async get(id: number | string): Promise<JournalBatch> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/journal-batches/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<JournalBatch>(res);
	},

	async create(payload: CreateJournalBatchRequest): Promise<JournalBatch> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/journal-batches`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<JournalBatch>(res);
	},

	async post(id: number | string): Promise<JournalBatch> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/journal-batches/${id}/post`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<JournalBatch>(res);
	},

	async close(id: number | string): Promise<JournalBatch> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/journal-batches/${id}/close`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<JournalBatch>(res);
	},

	async getEntries(id: number | string): Promise<LedgerEntry[]> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/journal-batches/${id}/entries`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<LedgerEntry[]>(res);
	},

	async recalculateTotals(id: number | string): Promise<void> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/journal-batches/${id}/recalculate-totals`, {
			method: "POST",
			headers: getAuthHeaders()
		});
		return handleJsonResponse<void>(res);
	}
};

export const closuresApi = {
	async closeDay(payload: CloseDayRequest): Promise<Closure> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/admin/close-day`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Closure>(res);
	},

	async closeMonth(payload: CloseMonthRequest): Promise<Closure> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/admin/close-month`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload)
		});
		return handleJsonResponse<Closure>(res);
	},

	async getClosure(id: number | string): Promise<Closure> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/admin/closures/${id}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Closure>(res);
	},

	async getClosures(
		closureType?: ClosureType,
		status?: ClosureStatus,
		date?: string,
		page: number = 0,
		size: number = 20
	): Promise<any> {
		const params = new URLSearchParams();
		if (closureType) params.append("closureType", closureType);
		if (status) params.append("status", status);
		if (date) params.append("date", date);
		params.append("page", page.toString());
		params.append("size", size.toString());
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/admin/closures?${params.toString()}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<any>(res);
	},

	async getClosuresList(
		closureType?: ClosureType,
		status?: ClosureStatus,
		date?: string
	): Promise<Closure[]> {
		const params = new URLSearchParams();
		if (closureType) params.append("closureType", closureType);
		if (status) params.append("status", status);
		if (date) params.append("date", date);
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/admin/closures/list?${params.toString()}`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<Closure[]>(res);
	},

	async validateClosure(id: number | string): Promise<ClosureValidationResponse> {
		const res = await fetchWithAutoRefresh(`${API_BASE}/api/ops/admin/closures/${id}/validation`, {
			headers: getAuthHeaders(),
			cache: "no-store"
		});
		return handleJsonResponse<ClosureValidationResponse>(res);
	}
};


