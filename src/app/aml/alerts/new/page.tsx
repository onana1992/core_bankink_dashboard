"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import type { AmlAlertSeverity } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const SEVERITIES: AmlAlertSeverity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

function AmlNewManualAlertForm() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [clientId, setClientId] = useState("");
	const [accountId, setAccountId] = useState("");
	const [transactionId, setTransactionId] = useState("");
	const [severity, setSeverity] = useState<AmlAlertSeverity>("MEDIUM");
	const [title, setTitle] = useState("");
	const [factsJson, setFactsJson] = useState('{\n  "reason": ""\n}');

	useEffect(() => {
		const p = searchParams.get("clientId")?.trim() ?? "";
		if (p && /^\d+$/.test(p)) {
			setClientId(p);
		}
	}, [searchParams]);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		let facts: Record<string, unknown>;
		try {
			facts = JSON.parse(factsJson) as Record<string, unknown>;
		} catch {
			setError(t("aml.manualAlert.invalidJson"));
			return;
		}
		const cid = Number(clientId);
		if (!Number.isFinite(cid) || cid <= 0) {
			setError(t("aml.manualAlert.clientRequired"));
			return;
		}
		if (!title.trim()) {
			setError(t("aml.manualAlert.titleRequired"));
			return;
		}
		setLoading(true);
		try {
			const alert = await amlApi.createManualAlert({
				clientId: cid,
				accountId: accountId.trim() ? Number(accountId) : undefined,
				transactionId: transactionId.trim() ? Number(transactionId) : undefined,
				severity,
				title: title.trim(),
				facts
			});
			router.push(`/aml/alerts/${alert.id}`);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<Link href="/aml/alerts" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("aml.alerts.backToList")}
				</Link>
				<h1 className="text-3xl font-bold text-gray-900">{t("aml.manualAlert.title")}</h1>
				<p className="text-gray-600 mt-1">{t("aml.manualAlert.subtitle")}</p>
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
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.manualAlert.clientId")} *</label>
					<Input className="h-10" value={clientId} onChange={(e) => setClientId(e.target.value)} required />
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.manualAlert.accountId")}</label>
						<Input className="h-10" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.manualAlert.transactionId")}</label>
						<Input className="h-10" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
					</div>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.severity")} *</label>
					<select className={SELECT_CLASS} value={severity} onChange={(e) => setSeverity(e.target.value as AmlAlertSeverity)}>
						{SEVERITIES.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.table.title")} *</label>
					<Input className="h-10" value={title} onChange={(e) => setTitle(e.target.value)} required />
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.manualAlert.factsJson")} *</label>
					<textarea
						className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[140px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
						value={factsJson}
						onChange={(e) => setFactsJson(e.target.value)}
						spellCheck={false}
					/>
				</div>
				<div className="flex flex-wrap gap-2 pt-2">
					<Button type="submit" disabled={loading}>
						{loading ? t("aml.saving") : t("aml.manualAlert.submit")}
					</Button>
					<Link href="/aml/alerts">
						<Button type="button" variant="outline">
							{t("aml.actions.cancel")}
						</Button>
					</Link>
				</div>
			</form>
		</div>
	);
}

export default function AmlNewManualAlertPage() {
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
			<AmlNewManualAlertForm />
		</Suspense>
	);
}
