"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { LoginResponse } from "@/types";

type AuthUser = NonNullable<LoginResponse["user"]>;

const USER_PROFILE_STORAGE_KEY = "authUserProfile";

/** Reconstruit un profil minimal depuis l'access token (sub, userId, claims) pour l'UI après F5. */
function userFromAccessToken(token: string): AuthUser | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;
		const payload = base64UrlToJson(parts[1]);
		const sub = payload.sub;
		if (typeof sub !== "string" || !sub.trim()) return null;
		const rawId = payload.userId;
		let id = 0;
		if (typeof rawId === "number" && Number.isFinite(rawId)) id = rawId;
		else if (typeof rawId === "string" && rawId.trim()) {
			const n = Number(rawId);
			if (Number.isFinite(n)) id = n;
		}
		const roles = Array.isArray(payload.roles)
			? (payload.roles as unknown[]).filter((r): r is string => typeof r === "string")
			: [];
		const permissions = Array.isArray(payload.permissions)
			? (payload.permissions as unknown[]).filter((p): p is string => typeof p === "string")
			: [];
		return {
			id,
			username: sub,
			email: "",
			firstName: null,
			lastName: null,
			roles,
			permissions
		};
	} catch {
		return null;
	}
}

/** Décode la partie payload d'un JWT (base64url). */
function base64UrlToJson(payloadB64: string): Record<string, unknown> {
	let base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
	const pad = base64.length % 4;
	if (pad) base64 += "=".repeat(4 - pad);
	const json = atob(base64);
	return JSON.parse(json) as Record<string, unknown>;
}

/** true si le token est absent, mal formé, ou expiré (avec marge `skewSeconds`). */
function isAccessTokenExpired(token: string, skewSeconds: number): boolean {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return true;
		const payload = base64UrlToJson(parts[1]);
		const exp = payload.exp;
		if (typeof exp !== "number") return false;
		return Date.now() / 1000 >= exp - skewSeconds;
	} catch {
		return true;
	}
}

function readStoredUserProfile(): AuthUser | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(USER_PROFILE_STORAGE_KEY);
		if (!raw) return null;
		const o = JSON.parse(raw) as Record<string, unknown>;
		if (typeof o.username !== "string" || !o.username.trim()) return null;
		return {
			id: typeof o.id === "number" && Number.isFinite(o.id) ? o.id : Number(o.id) || 0,
			username: o.username,
			email: typeof o.email === "string" ? o.email : "",
			firstName: typeof o.firstName === "string" ? o.firstName : null,
			lastName: typeof o.lastName === "string" ? o.lastName : null,
			roles: Array.isArray(o.roles) ? o.roles.filter((r): r is string => typeof r === "string") : [],
			permissions: Array.isArray(o.permissions)
				? o.permissions.filter((p): p is string => typeof p === "string")
				: []
		};
	} catch {
		return null;
	}
}

function persistUserProfile(user: AuthUser | null) {
	if (typeof window === "undefined") return;
	if (!user) {
		sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
		return;
	}
	sessionStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user));
}

/** Complète le profil JWT (sans email) avec le cache session ou l'inverse. */
function mergeUserProfiles(primary: AuthUser | null, fallback: AuthUser | null): AuthUser | null {
	if (!primary && !fallback) return null;
	if (!primary) return fallback;
	if (!fallback) return primary;
	if (fallback.username !== primary.username) return primary;
	return {
		...primary,
		email: primary.email?.trim() || fallback.email || "",
		firstName: primary.firstName ?? fallback.firstName ?? null,
		lastName: primary.lastName ?? fallback.lastName ?? null,
		id: primary.id || fallback.id,
		roles: primary.roles.length ? primary.roles : fallback.roles,
		permissions: primary.permissions.length ? primary.permissions : fallback.permissions
	};
}

function resolveSessionUser(): AuthUser | null {
	const token = authApi.getAccessToken();
	const jwtUser = token ? userFromAccessToken(token) : null;
	return mergeUserProfiles(jwtUser, readStoredUserProfile());
}

interface AuthContextType {
	user: LoginResponse["user"] | null;
	isAuthenticated: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	refreshToken: () => Promise<void>;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<LoginResponse["user"] | null>(null);
	const [loading, setLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	const syncUserProfileFromApi = useCallback(async () => {
		try {
			const profile = await authApi.getMe();
			persistUserProfile(profile);
			setUser(profile);
		} catch {
			const fallback = resolveSessionUser();
			if (fallback) setUser(fallback);
		}
	}, []);

	useEffect(() => {
		const bootstrap = async () => {
			const token = authApi.getAccessToken();
			const refresh = authApi.getRefreshToken();

			const applySessionUser = () => {
				setUser(resolveSessionUser());
			};

			if (!token) {
				setIsAuthenticated(false);
				setUser(null);
				persistUserProfile(null);
				setLoading(false);
				return;
			}

			// Ne pas considérer la session valide tant qu'on n'a pas un access token utilisable,
			// sinon les pages OPS appellent l'API en 401 avant que fetchWithAutoRefresh ne finisse.
			if (!isAccessTokenExpired(token, 60)) {
				setIsAuthenticated(true);
				applySessionUser();
				await syncUserProfileFromApi();
				setLoading(false);
				return;
			}

			if (refresh) {
				try {
					await authApi.refreshToken({ refreshToken: refresh });
					setIsAuthenticated(true);
					applySessionUser();
					await syncUserProfileFromApi();
				} catch {
					if (typeof window !== "undefined") {
						localStorage.removeItem("accessToken");
						localStorage.removeItem("refreshToken");
					}
					persistUserProfile(null);
					setIsAuthenticated(false);
					setUser(null);
				}
			} else {
				if (typeof window !== "undefined") {
					localStorage.removeItem("accessToken");
				}
				persistUserProfile(null);
				setIsAuthenticated(false);
				setUser(null);
			}
			setLoading(false);
		};

		void bootstrap();
	}, [syncUserProfileFromApi]);

	const login = async (username: string, password: string) => {
		const response = await authApi.login({ username, password });
		if (response?.user) {
			persistUserProfile(response.user);
			setUser(response.user);
		} else {
			const sessionUser = resolveSessionUser();
			setUser(sessionUser);
		}
		setIsAuthenticated(true);
		if (!response?.user?.email?.trim()) {
			await syncUserProfileFromApi();
		}
	};

	const logout = async () => {
		const refreshToken = authApi.getRefreshToken();
		if (refreshToken) {
			try {
				await authApi.logout({ refreshToken });
			} catch {
				if (typeof window !== "undefined") {
					localStorage.removeItem("accessToken");
					localStorage.removeItem("refreshToken");
				}
			}
		} else if (typeof window !== "undefined") {
			localStorage.removeItem("accessToken");
			localStorage.removeItem("refreshToken");
		}
		persistUserProfile(null);
		setUser(null);
		setIsAuthenticated(false);
	};

	const refreshToken = async () => {
		const refreshTokenValue = authApi.getRefreshToken();
		if (refreshTokenValue) {
			try {
				await authApi.refreshToken({ refreshToken: refreshTokenValue });
				setIsAuthenticated(true);
				setUser(resolveSessionUser());
				await syncUserProfileFromApi();
			} catch {
				persistUserProfile(null);
				setUser(null);
				setIsAuthenticated(false);
			}
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isAuthenticated,
				login,
				logout,
				refreshToken,
				loading
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
