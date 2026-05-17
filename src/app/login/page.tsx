"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
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
		const code = readLoginErrorFromUrl();
		if (code === "session_expired") {
			setError(t("login.errors.sessionExpired"));
		} else if (code === "not_authenticated") {
			setError(t("login.errors.notAuthenticated"));
		}
	}, [pathname, t]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

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
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : t("login.errors.loginError");
			setError(errorMessage);
			console.error("Login error:", e);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
			<div className="absolute right-4 top-4">
				<LanguageSwitcher />
			</div>

			<div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
				<div className="mb-8 flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-700">
						<LayoutDashboard className="h-5 w-5 text-white" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-base font-bold leading-snug text-slate-900">{t("sidebar.coreAdmin")}</h1>
						<p className="mt-0.5 text-sm text-slate-500">{t("sidebar.tailwindAdmin")}</p>
					</div>
				</div>

				{error && (
					<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
							{t("login.username")}
						</label>
						<Input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
							autoComplete="username"
							placeholder={t("login.usernamePlaceholder")}
							className="w-full"
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
							{t("login.password")}
						</label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							autoComplete="current-password"
							placeholder={t("login.passwordPlaceholder")}
							className="w-full"
						/>
					</div>

					<Button type="submit" disabled={loading} className="w-full">
						{loading ? t("login.submitting") : t("login.submit")}
					</Button>
				</form>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return <LoginContent />;
}
