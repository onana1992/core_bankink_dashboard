"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { LoginResponse } from "@/types";

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

	useEffect(() => {
		const bootstrap = async () => {
			const token = authApi.getAccessToken();
			const refresh = authApi.getRefreshToken();

			if (!token) {
				setIsAuthenticated(false);
				setLoading(false);
				return;
			}

			// Ne pas considérer la session valide tant qu'on n'a pas un access token utilisable,
			// sinon les pages OPS appellent l'API en 401 avant que fetchWithAutoRefresh ne finisse.
			if (!isAccessTokenExpired(token, 60)) {
				setIsAuthenticated(true);
				setLoading(false);
				return;
			}

			if (refresh) {
				try {
					await authApi.refreshToken({ refreshToken: refresh });
					setIsAuthenticated(true);
				} catch {
					if (typeof window !== "undefined") {
						localStorage.removeItem("accessToken");
						localStorage.removeItem("refreshToken");
					}
					setIsAuthenticated(false);
				}
			} else {
				if (typeof window !== "undefined") {
					localStorage.removeItem("accessToken");
				}
				setIsAuthenticated(false);
			}
			setLoading(false);
		};

		void bootstrap();
	}, []);

	const login = async (username: string, password: string) => {
		const response = await authApi.login({ username, password });
		if (response && response.user) {
			setUser(response.user);
			// Mettre à jour l'état d'authentification après la connexion
			setIsAuthenticated(true);
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

