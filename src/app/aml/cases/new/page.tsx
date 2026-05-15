"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { amlApi, usersApi } from "@/lib/api";
import type { User } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

function formatUserLabel(u: User): string {
	const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
	if (name) return `${u.username} — ${name}`;
	if (u.email) return `${u.username} (${u.email})`;
	return u.username;
}

function NewCaseForm() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [clientId, setClientId] = useState("");
	const [alertIdsStr, setAlertIdsStr] = useState("");
	const [ownerUserId, setOwnerUserId] = useState("");
	const [ownerUsers, setOwnerUsers] = useState<User[]>([]);
	const [ownerUsersLoading, setOwnerUsersLoading] = useState(true);
	const [ownerUsersError, setOwnerUsersError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const c = searchParams.get("clientId");
		const a = searchParams.get("alertIds");
		if (c) setClientId(c);
		if (a) setAlertIdsStr(a);
	}, [searchParams]);

	useEffect(() => {
		let cancelled = false;
		setOwnerUsersLoading(true);
		setOwnerUsersError(null);
		void (async () => {
			try {
				const data = await usersApi.list({ status: "ACTIVE", page: 0, size: 500 });
				if (cancelled) return;
				const list = [...(data.content ?? [])].sort((a, b) =>
					a.username.localeCompare(b.username, undefined, { sensitivity: "base" })
				);
				setOwnerUsers(list);
			} catch (e: unknown) {
				if (!cancelled) {
					setOwnerUsers([]);
					setOwnerUsersError(e instanceof Error ? e.message : String(e));
				}
			} finally {
				if (!cancelled) setOwnerUsersLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const cid = Number(clientId);
		if (!Number.isFinite(cid) || cid <= 0) {
			setError(t("aml.cases.clientRequired"));
			return;
		}
		const parts = alertIdsStr
			.split(/[\s,;]+/)
			.map((s) => s.trim())
			.filter(Boolean);
		const alertIds = parts.map((p) => Number(p)).filter((n) => Number.isFinite(n) && n > 0);
		if (alertIds.length === 0) {
			setError(t("aml.cases.alertsRequired"));
			return;
		}
		setLoading(true);
		try {
			const c = await amlApi.createCase({
				clientId: cid,
				alertIds,
				ownerUserId: ownerUserId.trim() ? Number(ownerUserId) : undefined
			});
			router.push(`/aml/cases/${c.id}`);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 flex-1">
					<h1 className="text-3xl font-bold text-gray-900">{t("aml.cases.newTitle")}</h1>
					<p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">{t("aml.cases.newSubtitle")}</p>
				</div>
				<div className="flex shrink-0 flex-wrap gap-3">
					<Link href="/aml/cases">
						<Button type="button" variant="outline" className="inline-flex items-center gap-2">
							<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
							{t("aml.cases.back")}
						</Button>
					</Link>
				</div>
			</div>

			<div className="max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<div className="flex items-start gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
						<FolderPlus className="h-5 w-5 text-blue-700" aria-hidden />
					</div>
					<div className="min-w-0 pt-0.5">
						<h2 className="text-lg font-semibold text-gray-900">{t("aml.cases.newFormSection")}</h2>
					</div>
				</div>

				<form onSubmit={submit} className="space-y-5 p-5">
					{error && (
						<div className="flex items-center gap-2 rounded border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800">
							<svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							{error}
						</div>
					)}

					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">{t("aml.filters.clientId")} *</label>
						<Input className="h-10" value={clientId} onChange={(e) => setClientId(e.target.value)} required inputMode="numeric" />
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">{t("aml.cases.alertIds")} *</label>
						<Input
							className="h-10 font-mono text-sm"
							value={alertIdsStr}
							onChange={(e) => setAlertIdsStr(e.target.value)}
							placeholder={t("aml.cases.alertIdsPlaceholder")}
							autoComplete="off"
						/>
						<p className="mt-1 text-xs text-gray-500">{t("aml.cases.alertIdsHint")}</p>
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="aml-new-case-owner">
							{t("aml.cases.ownerUserId")}
						</label>
						<select
							id="aml-new-case-owner"
							className={SELECT_CLASS}
							value={ownerUserId}
							onChange={(e) => setOwnerUserId(e.target.value)}
							disabled={loading || ownerUsersLoading}
						>
							<option value="">
								{ownerUsersLoading ? t("aml.loading") : t("aml.cases.ownerNone")}
							</option>
							{ownerUsers.map((u) => (
								<option key={u.id} value={String(u.id)}>
									{formatUserLabel(u)}
								</option>
							))}
						</select>
						{ownerUsersError ? (
							<p className="mt-2 text-sm text-red-600">
								{t("aml.alertDetail.usersLoadError")} {ownerUsersError}
							</p>
						) : null}
					</div>

					<div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
						<Button type="submit" disabled={loading} className="min-w-[8rem]">
							{loading ? t("aml.saving") : t("aml.cases.submit")}
						</Button>
						<Link href="/aml/cases">
							<Button type="button" variant="outline" disabled={loading}>
								{t("aml.actions.cancel")}
							</Button>
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}

export default function AmlNewCasePage() {
	const { t } = useTranslation();
	return (
		<Suspense
			fallback={
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			}
		>
			<NewCaseForm />
		</Suspense>
	);
}
