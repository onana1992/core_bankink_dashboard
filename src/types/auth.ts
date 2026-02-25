export type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED" | "EXPIRED";

export interface User {
	id: number;
	username: string;
	email: string;
	status: UserStatus;
	firstName?: string | null;
	lastName?: string | null;
	lastLoginAt?: string | null;
	failedLoginAttempts: number;
	lockedUntil?: string | null;
	createdAt: string;
	updatedAt: string;
	roles?: Role[];
}

export interface Role {
	id: number;
	name: string;
	description?: string | null;
	createdAt: string;
	permissions?: Permission[];
}

export interface Permission {
	id: number;
	name: string;
	resource: string;
	action: string;
	description?: string | null;
	createdAt: string;
}

export interface AuditEvent {
	id: number;
	user?: {
		id: number;
		username: string;
	} | null;
	action: string;
	resourceType: string;
	resourceId?: number | null;
	details?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	createdAt: string;
}

export interface LoginRequest {
	username: string;
	password: string;
}

export interface RefreshTokenRequest {
	refreshToken: string;
}

export interface LoginResponse {
	accessToken: string;
	refreshToken: string;
	tokenType: string;
	expiresIn: number;
	user: {
		id: number;
		username: string;
		email: string;
		firstName?: string | null;
		lastName?: string | null;
		roles: string[];
		permissions: string[];
	} | null;
}

export interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	firstName?: string | null;
	lastName?: string | null;
	status?: UserStatus;
	roleIds?: number[];
}

export interface UpdateUserRequest {
	email?: string;
	password?: string;
	firstName?: string | null;
	lastName?: string | null;
	status?: UserStatus;
}

export interface CreateRoleRequest {
	name: string;
	description?: string | null;
	permissionIds?: number[];
}

export interface UpdateRoleRequest {
	name?: string;
	description?: string | null;
}

export interface CreatePermissionRequest {
	name: string;
	resource: string;
	action: string;
	description?: string | null;
}

export interface UpdatePermissionRequest {
	name?: string;
	resource?: string;
	action?: string;
	description?: string | null;
}

export interface AssignRoleRequest {
	roleId: number;
}

export interface AssignPermissionsRequest {
	permissionIds: number[];
}

// --- Service Registry (tokens pour applications tierces) ---
export type ServiceStatus = "ACTIVE" | "INACTIVE" | "REVOKED";
export type ServiceTokenStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export interface ServiceRegistry {
	id: number;
	externalId: string;
	name: string;
	slug: string;
	description?: string | null;
	status: ServiceStatus;
	createdAt: string;
	updatedAt: string;
	createdBy?: number | null;
	/** Utilisateur associé au service (le service = cet utilisateur). */
	linkedUserId?: number | null;
	metadata?: Record<string, unknown> | null;
}

export interface ServiceToken {
	id: number;
	serviceId: number;
	userId: number;
	jti: string;
	/** Valeur JWT stockée (affichable/copiable). Null pour les anciens tokens non persistés. */
	tokenValue?: string | null;
	name?: string | null;
	status: ServiceTokenStatus;
	expiresAt?: string | null;
	createdAt: string;
	revokedAt?: string | null;
	lastUsedAt?: string | null;
}

export interface CreateServiceRegistryRequest {
	name: string;
	slug: string;
	description?: string | null;
	metadata?: Record<string, unknown> | null;
	/** Si true, crée et lie l'utilisateur svc-{slug} au service. Défaut true. */
	createServiceUser?: boolean;
}

export interface UpdateServiceRegistryRequest {
	name?: string;
	description?: string | null;
	status?: ServiceStatus;
	metadata?: Record<string, unknown> | null;
}

export interface GenerateServiceTokenRequest {
	/** Optionnel : si absent, utilise l'utilisateur lié au service. */
	userId?: number | null;
	name?: string | null;
	/** Durée de vie en secondes ; null ou 0 = pas d'expiration. */
	expiresInSeconds?: number | null;
}

export interface GenerateServiceTokenResponse {
	tokenId: number;
	accessToken: string;
	tokenType: string;
	expiresAt: string;
	serviceId: number;
	userId: number;
	message: string;
}

export interface AuditStatisticsResponse {
	totalEvents: number;
	eventsLast24Hours: number;
	eventsLast7Days: number;
	eventsLast30Days: number;
	eventsByAction: Record<string, number>;
	eventsByResourceType: Record<string, number>;
	eventsByUser: Record<string, number>;
	uniqueUsers: number;
	uniqueResources: number;
}

/** Réponse paginée (alignée sur le backend: page, suivant, précédent). */
export interface PagedResponse<T> {
	content: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
	first: boolean;
	last: boolean;
	hasNext: boolean;
	hasPrevious: boolean;
	nextPage: number | null;
	previousPage: number | null;
}

export interface AuditResourceTraceResponse {
	resourceType: string;
	resourceId: number;
	events: AuditEvent[];
	totalEvents: number;
	firstEvent: AuditEvent | null;
	lastEvent: AuditEvent | null;
}
















