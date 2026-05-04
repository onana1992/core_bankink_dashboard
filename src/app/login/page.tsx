"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function readLoginErrorFromUrl(): string | null {
	if (typeof window === "undefined") return null;
	const errorParam = new URLSearchParams(window.location.search).get("error");
	if (errorParam === "session_expired") return "session_expired";
	if (errorParam === "not_authenticated") return "not_authenticated";
	return null;
}

function LoginContent() {
	const router = useRouter();
	const pathname = usePathname();
	const { t } = useTranslation();
	const { login, isAuthenticated } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isAuthenticated) {
			router.push("/");
		}
	}, [isAuthenticated, router]);

	useEffect(() => {
		// Lecture côté client uniquement : évite useSearchParams + Suspense (fallback SSR ≠ arbre hydraté).
		const code = readLoginErrorFromUrl();
		if (code === "session_expired") {
			setError(t("login.errors.sessionExpired"));
		} else if (code === "not_authenticated") {
			setError(t("login.errors.notAuthenticated"));
		}
		// Ne pas appeler setError(null) ici : préserver erreurs validation / API login.
	}, [pathname, t]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		// Validation côté client
		if (!username.trim()) {
			setError(t("login.errors.usernameRequired"));
			setLoading(false);
			return;
		}
		if (!password.trim()) {
			setError(t("login.errors.passwordRequired"));
			setLoading(false);
			return;
		}

		try {
			await login(username.trim(), password);
			router.push("/");
		} catch (e: any) {
			const errorMessage = e?.message ?? t("login.errors.loginError");
			setError(errorMessage);
			console.error("Login error:", e);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-white flex flex-col">
			<header className="w-full flex justify-end p-4">
				<LanguageSwitcher />
			</header>
			<div className="flex-1 flex items-center justify-center">
				<div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">{t("login.title")}</h1>
					<p className="text-gray-600">{t("login.subtitle")}</p>
				</div>

				{error && (
					<div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("login.username")}
						</label>
						<Input
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
							placeholder={t("login.usernamePlaceholder")}
							className="w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("login.password")}
						</label>
						<Input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							placeholder={t("login.passwordPlaceholder")}
							className="w-full"
						/>
					</div>

					<Button
						type="submit"
						disabled={loading}
						className="w-full"
					>
						{loading ? t("login.submitting") : t("login.submit")}
					</Button>
				</form>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return <LoginContent />;
}


