"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function NewCaseForm() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [clientId, setClientId] = useState("");
	const [alertIdsStr, setAlertIdsStr] = useState("");
	const [ownerUserId, setOwnerUserId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const c = searchParams.get("clientId");
		const a = searchParams.get("alertIds");
		if (c) setClientId(c);
		if (a) setAlertIdsStr(a);
	}, [searchParams]);

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
		setBusy(true);
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
			setBusy(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<Link href="/aml/cases" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("aml.cases.back")}
				</Link>
				<h1 className="text-3xl font-bold text-gray-900">{t("aml.cases.newTitle")}</h1>
				<p className="text-gray-600 mt-1">{t("aml.cases.newSubtitle")}</p>
			</div>

			<form onSubmit={submit} className="max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2 text-sm">
						<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				)}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.clientId")} *</label>
					<Input className="h-10" value={clientId} onChange={(e) => setClientId(e.target.value)} required />
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.cases.alertIds")} *</label>
					<Input
						className="h-10 font-mono text-sm"
						value={alertIdsStr}
						onChange={(e) => setAlertIdsStr(e.target.value)}
						placeholder="1, 2, 3"
					/>
					<p className="text-xs text-gray-500 mt-1">{t("aml.cases.alertIdsHint")}</p>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.cases.ownerUserId")}</label>
					<Input className="h-10" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} />
				</div>
				<div className="flex flex-wrap gap-2 pt-2">
					<Button type="submit" disabled={busy}>
						{busy ? t("aml.saving") : t("aml.cases.submit")}
					</Button>
					<Link href="/aml/cases">
						<Button type="button" variant="outline">
							{t("aml.actions.cancel")}
						</Button>
					</Link>
				</div>
			</form>
		</div>
	);
}

export default function AmlNewCasePage() {
	const { t } = useTranslation();
	return (
		<Suspense
			fallback={
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			}
		>
			<NewCaseForm />
		</Suspense>
	);
}
