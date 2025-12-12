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

export interface AssignRoleRequest {
	roleId: number;
}

export interface AssignPermissionsRequest {
	permissionIds: number[];
}









