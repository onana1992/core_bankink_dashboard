"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { LoginResponse, User } from "@/types";

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

	useEffect(() => {
		// Vérifier si l'utilisateur est déjà authentifié
		const token = authApi.getAccessToken();
		if (token) {
			// Optionnel: charger les infos utilisateur depuis le token ou une API
			// Pour l'instant, on garde juste le token
		}
		setLoading(false);
	}, []);

	const login = async (username: string, password: string) => {
		const response = await authApi.login({ username, password });
		setUser(response.user);
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
	};

	const refreshToken = async () => {
		const refreshToken = authApi.getRefreshToken();
		if (refreshToken) {
			try {
				await authApi.refreshToken({ refreshToken });
			} catch (e) {
				// Si le refresh échoue, déconnecter l'utilisateur
				setUser(null);
			}
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isAuthenticated: !!user || authApi.isAuthenticated(),
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

