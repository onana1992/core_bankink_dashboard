"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Clock, Info, RefreshCw, Users } from "lucide-react";
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

function vigilanceStatusBadgeClass(code: string | undefined): string {
	const m = (code ?? "").toUpperCase();
	if (m === "OK" || m === "NO_STALE_CLIENTS") {
		return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
	}
	if (m === "NEVER" || !m) {
		return "bg-slate-50 text-slate-800 ring-slate-200/80";
	}
	return "bg-amber-50 text-amber-900 ring-amber-200/80";
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
	const utcIso = data?.at ? new Date(data.at).toISOString() : null;

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
						<div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<div className="mb-1 text-sm font-medium text-blue-700">{t("complianceVigilancePage.summaryLastRun")}</div>
									<div className="truncate text-lg font-bold text-blue-900 sm:text-xl" title={data?.at ?? undefined}>
										{isNever ? "—" : lastRunDisplay}
									</div>
								</div>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-200">
									<Clock className="h-6 w-6 text-blue-700" aria-hidden />
								</div>
							</div>
						</div>
						<div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 p-5 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<div>
									<div className="mb-1 text-sm font-medium text-sky-700">{t("complianceVigilancePage.processed")}</div>
									<div className="text-3xl font-bold text-sky-900">{data?.clientsProcessed ?? 0}</div>
								</div>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-200">
									<Users className="h-6 w-6 text-sky-700" aria-hidden />
								</div>
							</div>
						</div>
						<div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 p-5 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<div>
									<div className="mb-1 text-sm font-medium text-violet-700">{t("complianceVigilancePage.updated")}</div>
									<div className="text-3xl font-bold text-violet-900">{data?.profilesUpdated ?? 0}</div>
								</div>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-200">
									<Activity className="h-6 w-6 text-violet-700" aria-hidden />
								</div>
							</div>
						</div>
					</div>

					<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
						<div className="border-b border-gray-200 bg-gray-50/90 px-4 py-4 sm:px-6">
							<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("complianceVigilancePage.detailsTitle")}</h2>
						</div>
						<div className="bg-gradient-to-b from-gray-50/95 to-white px-4 py-5 sm:px-6 sm:py-6">
							{isNever ? (
								<div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
									<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
										<Clock className="h-6 w-6" aria-hidden />
									</div>
									<p className="mx-auto max-w-md text-sm leading-relaxed text-gray-600">{t("complianceVigilancePage.never")}</p>
								</div>
							) : (
								<div className="space-y-4">
									<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04] sm:flex sm:items-start sm:gap-4">
										<div className="mb-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 sm:mb-0">
											<Clock className="h-4 w-4" aria-hidden />
										</div>
										<div className="min-w-0 flex-1">
											<p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
												{t("complianceVigilancePage.lastAt")}
											</p>
											<p className="text-sm font-semibold tabular-nums text-gray-900">{lastRunDisplay}</p>
											<p className="mt-2 break-all font-mono text-xs leading-relaxed text-gray-600">{utcIso ?? "—"}</p>
										</div>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
											<div className="mb-3 flex items-center gap-2 text-gray-500">
												<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
													<Users className="h-4 w-4" aria-hidden />
												</div>
												<span className="text-[11px] font-bold uppercase tracking-wide">{t("complianceVigilancePage.processed")}</span>
											</div>
											<p className="text-2xl font-bold tabular-nums text-gray-900">{data?.clientsProcessed ?? 0}</p>
										</div>
										<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
											<div className="mb-3 flex items-center gap-2 text-gray-500">
												<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
													<Activity className="h-4 w-4" aria-hidden />
												</div>
												<span className="text-[11px] font-bold uppercase tracking-wide">{t("complianceVigilancePage.updated")}</span>
											</div>
											<p className="text-2xl font-bold tabular-nums text-gray-900">{data?.profilesUpdated ?? 0}</p>
										</div>
									</div>
									<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
										<div className="mb-3 flex items-center gap-2 text-gray-500">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
												<Info className="h-4 w-4" aria-hidden />
											</div>
											<span className="text-[11px] font-bold uppercase tracking-wide">{t("complianceVigilancePage.message")}</span>
										</div>
										<span
											className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${vigilanceStatusBadgeClass(data?.message)}`}
										>
											{data?.message ?? "—"}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
