"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import type { AmlRiskProfileDto } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

function AmlRiskProfilesInner() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const clientIdFromUrl = searchParams.get("clientId");
	const [clientId, setClientId] = useState("");
	const [rows, setRows] = useState<AmlRiskProfileDto[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const stats = useMemo(() => {
		let active = 0;
		let high = 0;
		let enhanced = 0;
		for (const r of rows) {
			if (r.active) active++;
			if (r.riskLevel === "HIGH") high++;
			if (r.diligenceLevel === "ENHANCED") enhanced++;
		}
		return { total: rows.length, active, high, enhanced };
	}, [rows]);

	const loadByClientNumericId = useCallback(async (id: number) => {
		setLoading(true);
		setError(null);
		try {
			const list = await amlApi.listRiskProfiles(id);
			setRows(list ?? []);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const p = clientIdFromUrl?.trim() ?? "";
		if (!p || !/^\d+$/.test(p)) return;
		setClientId(p);
		let cancelled = false;
		void (async () => {
			setLoading(true);
			setError(null);
			try {
				const list = await amlApi.listRiskProfiles(Number(p));
				if (!cancelled) setRows(list ?? []);
			} catch (e: unknown) {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "Error");
					setRows([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [clientIdFromUrl]);

	async function loadClick() {
		const id = Number(clientId.trim());
		if (!Number.isFinite(id) || id <= 0) {
			setError(t("aml.risk.clientRequired"));
			return;
		}
		await loadByClientNumericId(id);
	}

	async function recompute() {
		const id = Number(clientId.trim());
		if (!Number.isFinite(id) || id <= 0) {
			setError(t("aml.risk.clientRequired"));
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await amlApi.recomputeRiskProfile(id);
			const list = await amlApi.listRiskProfiles(id);
			setRows(list ?? []);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("show-toast", {
						detail: { message: t("aml.risk.recomputeDone"), type: "success" }
					})
				);
			}
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
		} finally {
			setLoading(false);
		}
	}

	const factorsPretty: Record<number, string> = {};
	for (const r of rows) {
		if (r.factorsJson) {
			try {
				factorsPretty[r.id] = JSON.stringify(JSON.parse(r.factorsJson), null, 2);
			} catch {
				factorsPretty[r.id] = r.factorsJson;
			}
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("aml.risk.title")}</h1>
					<p className="text-gray-600 mt-1">{t("aml.risk.subtitle")}</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Link href="/customers">
						<Button type="button" variant="outline" className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							{t("aml.risk.openCustomers")}
						</Button>
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("aml.risk.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">{t("aml.risk.stats.active")}</div>
							<div className="text-3xl font-bold text-green-900">{stats.active}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">{t("aml.risk.stats.high")}</div>
							<div className="text-3xl font-bold text-red-900">{stats.high}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl shadow-sm border border-amber-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-amber-800 mb-1">{t("aml.risk.stats.enhanced")}</div>
							<div className="text-3xl font-bold text-amber-900">{stats.enhanced}</div>
						</div>
						<div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
					</div>
				</div>
			</div>
			<p className="text-xs text-gray-500 -mt-2">{t("aml.risk.statsHint")}</p>

			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("aml.filters.title")}</h2>
				</div>
				<div className="flex flex-wrap gap-4 items-end">
					<div className="min-w-[200px] flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.clientId")}</label>
						<Input className="h-10" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="ID" />
					</div>
					<Button type="button" className="h-10" onClick={() => void loadClick()} disabled={loading}>
						{t("aml.risk.loadHistory")}
					</Button>
					<Button type="button" variant="outline" className="h-10" onClick={() => void recompute()} disabled={loading}>
						{t("aml.risk.recompute")}
					</Button>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{loading && rows.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.risk.computedAt")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.risk.level")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.risk.score")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.risk.diligence")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.risk.active")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.risk.by")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{rows.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-6 py-12 text-center text-gray-500">
											{t("aml.risk.empty")}
										</td>
									</tr>
								) : (
									rows.map((r) => (
										<tr key={r.id} className="hover:bg-gray-50 transition-colors align-top">
											<td className="px-6 py-4 whitespace-nowrap text-gray-900">
												{r.computedAt ? new Date(r.computedAt).toLocaleString() : "—"}
											</td>
											<td className="px-6 py-4 text-gray-900">{r.riskLevel}</td>
											<td className="px-6 py-4 text-gray-700">{r.riskScore ?? "—"}</td>
											<td className="px-6 py-4 text-gray-700">{r.diligenceLevel}</td>
											<td className="px-6 py-4">
												{r.active ? <Badge variant="success">{t("aml.risk.yes")}</Badge> : <Badge>{t("aml.risk.no")}</Badge>}
											</td>
											<td className="px-6 py-4 text-xs text-gray-600">{r.computedBy ?? "—"}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{rows
				.filter((r) => Boolean(factorsPretty[r.id]))
				.map((r) => (
					<details key={`f-${r.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 group">
						<summary className="cursor-pointer text-lg font-semibold text-gray-900 list-none flex items-center gap-2">
							<svg className="w-5 h-5 text-gray-500 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
							{t("aml.risk.factors")} — {r.computedAt ? new Date(r.computedAt).toLocaleString() : r.id}
						</summary>
						<pre className="mt-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-100 overflow-x-auto">{factorsPretty[r.id]}</pre>
					</details>
				))}
		</div>
	);
}

export default function AmlRiskProfilesPage() {
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
			<AmlRiskProfilesInner />
		</Suspense>
	);
}
