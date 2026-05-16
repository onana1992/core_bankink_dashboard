"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { LoginResponse } from "@/types";

/** Reconstruit un profil minimal depuis l'access token (sub, userId, claims) pour l'UI après F5. */
function userFromAccessToken(token: string): LoginResponse["user"] | null {
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
			setUser(profile);
		} catch {
			/* profil minimal JWT / login conservé */
		}
	}, []);

	useEffect(() => {
		const bootstrap = async () => {
			const token = authApi.getAccessToken();
			const refresh = authApi.getRefreshToken();

			const applyUserFromStoredAccessToken = () => {
				const t = authApi.getAccessToken();
				setUser(t ? userFromAccessToken(t) : null);
			};

			if (!token) {
				setIsAuthenticated(false);
				setUser(null);
				setLoading(false);
				return;
			}

			// Ne pas considérer la session valide tant qu'on n'a pas un access token utilisable,
			// sinon les pages OPS appellent l'API en 401 avant que fetchWithAutoRefresh ne finisse.
			if (!isAccessTokenExpired(token, 60)) {
				setIsAuthenticated(true);
				applyUserFromStoredAccessToken();
				setLoading(false);
				void syncUserProfileFromApi();
				return;
			}

			if (refresh) {
				try {
					await authApi.refreshToken({ refreshToken: refresh });
					setIsAuthenticated(true);
					applyUserFromStoredAccessToken();
					void syncUserProfileFromApi();
				} catch {
					if (typeof window !== "undefined") {
						localStorage.removeItem("accessToken");
						localStorage.removeItem("refreshToken");
					}
					setIsAuthenticated(false);
					setUser(null);
				}
			} else {
				if (typeof window !== "undefined") {
					localStorage.removeItem("accessToken");
				}
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
			setUser(response.user);
		} else {
			const t = authApi.getAccessToken();
			setUser(t ? userFromAccessToken(t) : null);
		}
		setIsAuthenticated(true);
		if (!response?.user?.email?.trim()) {
			void syncUserProfileFromApi();
		}
	};

	const logout = async () => {
		const refreshToken = authApi.getRefreshToken();
		if (refreshToken) {
			try {
				await authApi.logout({ refreshToken });
			} catch (e) {
				// Ignorer les erreurs lors du logout, mais supprimer quand même les tokens localement
				if (typeof window !== 'undefined') {
					localStorage.removeItem('accessToken');
					localStorage.removeItem('refreshToken');
				}
			}
		} else {
			// Si pas de refresh token, supprimer quand même les tokens locaux
			if (typeof window !== 'undefined') {
				localStorage.removeItem('accessToken');
				localStorage.removeItem('refreshToken');
			}
		}
		setUser(null);
		setIsAuthenticated(false);
	};

	const refreshToken = async () => {
		const refreshToken = authApi.getRefreshToken();
		if (refreshToken) {
			try {
				await authApi.refreshToken({ refreshToken });
				setIsAuthenticated(true);
				const t = authApi.getAccessToken();
				setUser(t ? userFromAccessToken(t) : null);
				void syncUserProfileFromApi();
			} catch (e) {
				// Si le refresh échoue, déconnecter l'utilisateur
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

