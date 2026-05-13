"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Clock, RefreshCw, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import { complianceApi, type VigilanceLastRun } from "@/lib/api";

function formatDateTime(iso: string | null, locale: string): string {
	if (!iso) return "—";
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		const loc = locale === "fr" ? "fr-FR" : "en-US";
		return d.toLocaleString(loc, {
			dateStyle: "medium",
			timeStyle: "short"
		});
	} catch {
		return iso;
	}
}

export default function ComplianceVigilancePage() {
	const { t, i18n } = useTranslation();
	const [data, setData] = useState<VigilanceLastRun | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const r = await complianceApi.lastVigilanceRun();
			setData(r);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const isNever = useMemo(
		() => Boolean(data && !data.at && data.message === "NEVER"),
		[data]
	);

	const lastRunDisplay = formatDateTime(data?.at ?? null, i18n.language || "fr");

	return (
		<div className="w-full min-w-0 space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("complianceVigilancePage.title")}</h1>
					<p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
						{t("complianceVigilancePage.subtitle")}
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button
						type="button"
						variant="outline"
						className="flex items-center gap-2"
						onClick={() => void load()}
						disabled={loading}
					>
						<RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
						{t("common.refresh")}
					</Button>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded border-l-4 border-red-400 bg-red-50 px-4 py-3 text-red-800">
					<svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>
						{t("complianceVigilancePage.loadError")} {error}
					</span>
				</div>
			)}

			{loading ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("common.loading")}</p>
				</div>
			) : error && !data ? null : (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<div className="mb-1 text-sm font-medium text-indigo-800">
										{t("complianceVigilancePage.summaryLastRun")}
									</div>
									<div className="truncate text-lg font-bold text-indigo-950 sm:text-xl" title={data?.at ?? undefined}>
										{isNever ? "—" : lastRunDisplay}
									</div>
								</div>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-200/90">
									<Clock className="h-6 w-6 text-indigo-800" aria-hidden />
								</div>
							</div>
						</div>
						<div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<div>
									<div className="mb-1 text-sm font-medium text-blue-800">{t("complianceVigilancePage.processed")}</div>
									<div className="text-3xl font-bold text-blue-950">{data?.clientsProcessed ?? 0}</div>
								</div>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-200/90">
									<Users className="h-6 w-6 text-blue-800" aria-hidden />
								</div>
							</div>
						</div>
						<div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<div>
									<div className="mb-1 text-sm font-medium text-emerald-800">{t("complianceVigilancePage.updated")}</div>
									<div className="text-3xl font-bold text-emerald-950">{data?.profilesUpdated ?? 0}</div>
								</div>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-200/90">
									<Activity className="h-6 w-6 text-emerald-800" aria-hidden />
								</div>
							</div>
						</div>
					</div>

					<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
						<div className="border-b border-gray-200 bg-gray-50/90 px-4 py-4 sm:px-6">
							<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
								{t("complianceVigilancePage.detailsTitle")}
							</h2>
						</div>
						<div className="p-6">
							{isNever ? (
								<p className="text-gray-600">{t("complianceVigilancePage.never")}</p>
							) : (
								<dl className="grid gap-4 sm:grid-cols-2">
									<div className="sm:col-span-2">
										<dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
											{t("complianceVigilancePage.lastAt")}
										</dt>
										<dd className="mt-1 font-mono text-sm text-gray-900">{data?.at ? new Date(data.at).toISOString() : "—"}</dd>
									</div>
									<div>
										<dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
											{t("complianceVigilancePage.processed")}
										</dt>
										<dd className="mt-1 text-sm font-medium text-gray-900">{data?.clientsProcessed ?? 0}</dd>
									</div>
									<div>
										<dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
											{t("complianceVigilancePage.updated")}
										</dt>
										<dd className="mt-1 text-sm font-medium text-gray-900">{data?.profilesUpdated ?? 0}</dd>
									</div>
									<div className="sm:col-span-2">
										<dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
											{t("complianceVigilancePage.message")}
										</dt>
										<dd className="mt-1 text-sm font-medium text-gray-900">{data?.message ?? "—"}</dd>
									</div>
								</dl>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
