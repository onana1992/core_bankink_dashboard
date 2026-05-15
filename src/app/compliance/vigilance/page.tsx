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
		return "bg-emerald-50 text-emerald-900 ring-emerald-200/90";
	}
	if (m === "NEVER" || !m) {
		return "bg-slate-100 text-slate-700 ring-slate-200/90";
	}
	return "bg-amber-50 text-amber-900 ring-amber-200/90";
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

					<div className="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-black/[0.04]">
						<div className="flex items-center gap-3 border-b border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-white to-slate-50 px-4 py-4 sm:px-6">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 shadow-sm ring-1 ring-indigo-200/60">
								<Info className="h-5 w-5" aria-hidden />
							</div>
							<div className="min-w-0">
								<h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-900/90">
									{t("complianceVigilancePage.detailsTitle")}
								</h2>
							</div>
						</div>
						<div className="bg-gradient-to-b from-gray-50/90 to-white px-4 py-5 sm:px-6 sm:py-6">
							{isNever ? (
								<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white/80 px-6 py-10 text-center">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200/80">
										<Clock className="h-6 w-6" aria-hidden />
									</div>
									<p className="max-w-md text-sm leading-relaxed text-gray-600">{t("complianceVigilancePage.never")}</p>
								</div>
							) : (
								<dl className="grid gap-4 sm:grid-cols-2">
									<div className="sm:col-span-2">
										<div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-sm ring-1 ring-indigo-900/[0.06] sm:flex sm:items-start sm:gap-4">
											<div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 sm:mb-0">
												<Clock className="h-5 w-5" aria-hidden />
											</div>
											<div className="min-w-0 flex-1">
												<dt className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/80">
													{t("complianceVigilancePage.lastAt")}
												</dt>
												<dd className="mt-2 text-lg font-semibold tabular-nums text-indigo-950">{lastRunDisplay}</dd>
												<p className="mt-2 break-all font-mono text-xs leading-relaxed text-gray-500">{utcIso ?? "—"}</p>
											</div>
										</div>
									</div>
									<div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white p-4 shadow-sm ring-1 ring-blue-900/[0.05]">
										<div className="flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
												<Users className="h-5 w-5" aria-hidden />
											</div>
											<div className="min-w-0">
												<dt className="text-[11px] font-bold uppercase tracking-wide text-blue-900/80">
													{t("complianceVigilancePage.processed")}
												</dt>
												<dd className="mt-2 text-2xl font-bold tabular-nums text-blue-950">{data?.clientsProcessed ?? 0}</dd>
											</div>
										</div>
									</div>
									<div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm ring-1 ring-emerald-900/[0.05]">
										<div className="flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
												<Activity className="h-5 w-5" aria-hidden />
											</div>
											<div className="min-w-0">
												<dt className="text-[11px] font-bold uppercase tracking-wide text-emerald-900/80">
													{t("complianceVigilancePage.updated")}
												</dt>
												<dd className="mt-2 text-2xl font-bold tabular-nums text-emerald-950">{data?.profilesUpdated ?? 0}</dd>
											</div>
										</div>
									</div>
									<div className="sm:col-span-2">
										<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
											<div className="flex flex-wrap items-center gap-2">
												<dt className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
													{t("complianceVigilancePage.message")}
												</dt>
												<span
													className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${vigilanceStatusBadgeClass(data?.message)}`}
												>
													{data?.message ?? "—"}
												</span>
											</div>
										</div>
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
