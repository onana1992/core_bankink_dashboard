"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Braces, Eye, Hash, RefreshCw, Shield, User, X } from "lucide-react";
import { amlApi } from "@/lib/api";
import type { AmlRiskProfileDto, AmlDiligenceLevel, AmlRiskLevel, ForceAmlRiskProfileRequest } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";

function formatFactorsJson(factorsJson: string | null): string | null {
	if (!factorsJson) return null;
	try {
		return JSON.stringify(JSON.parse(factorsJson), null, 2);
	} catch {
		return factorsJson;
	}
}

function riskLevelBadgeClass(level: AmlRiskLevel): string {
	switch (level) {
		case "HIGH":
			return "bg-red-50 text-red-900 ring-red-200/80";
		case "MEDIUM":
			return "bg-amber-50 text-amber-900 ring-amber-200/80";
		default:
			return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
	}
}

function diligenceBadgeClass(level: AmlDiligenceLevel): string {
	return level === "ENHANCED"
		? "bg-violet-50 text-violet-900 ring-violet-200/80"
		: "bg-slate-50 text-slate-800 ring-slate-200/80";
}

const RISK_LEVELS: AmlRiskLevel[] = ["LOW", "MEDIUM", "HIGH"];
const DILIGENCE_LEVELS: AmlDiligenceLevel[] = ["STANDARD", "ENHANCED"];
const FORCE_RATIONALE_MIN = 20;

function AmlRiskProfileDetailModal({
	profile,
	factorsFormatted,
	onClose
}: {
	profile: AmlRiskProfileDto;
	factorsFormatted: string | null;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const computedLabel = profile.computedAt ? new Date(profile.computedAt).toLocaleString() : "—";

	useEffect(() => {
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="aml-risk-profile-modal-title">
			<button
				type="button"
				className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
				aria-label={t("aml.risk.modalClose")}
				onClick={onClose}
			/>
			<div className="relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
				<header className="shrink-0 border-b border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 px-5 py-4 sm:px-6">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1 space-y-2">
							<p id="aml-risk-profile-modal-title" className="text-xs font-medium uppercase tracking-wide text-emerald-800">
								{t("aml.risk.detailModalEyebrow")}
							</p>
							<p className="break-all font-mono text-sm font-semibold text-emerald-950">
								{t("aml.risk.detailTitle", { id: profile.id })}
							</p>
							<p className="text-sm text-emerald-900/90">
								{t("aml.risk.detailClientLabel")}:{" "}
								<span className="font-semibold tabular-nums">{profile.clientId}</span>
							</p>
							<div className="flex flex-wrap gap-2 pt-1">
								<span
									className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${riskLevelBadgeClass(profile.riskLevel)}`}
								>
									{profile.riskLevel}
								</span>
								<span
									className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${diligenceBadgeClass(profile.diligenceLevel)}`}
								>
									{profile.diligenceLevel}
								</span>
								<span
									className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${profile.active ? "bg-white/70 text-emerald-900 ring-emerald-300/80" : "bg-white/50 text-gray-700 ring-emerald-200/60"}`}
								>
									{profile.active ? t("aml.risk.activeYesBadge") : t("aml.risk.activeNoBadge")}
								</span>
								{profile.riskScore !== null && profile.riskScore !== undefined ? (
									<span className="inline-flex items-center rounded-md bg-white/80 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-950 ring-1 ring-emerald-200/80">
										{t("aml.risk.score")}: {profile.riskScore}
									</span>
								) : null}
							</div>
							<p className="text-xs text-emerald-900/80">
								<span className="font-medium">{t("aml.risk.by")}:</span> {profile.computedBy ?? "—"} · {computedLabel}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="shrink-0 rounded-lg p-2 text-emerald-800 transition-colors hover:bg-emerald-200/70 hover:text-emerald-950"
							aria-label={t("aml.risk.modalClose")}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</header>

				<div className="flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-gray-50/95 to-white">
					<div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
						<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
							<div className="mb-3 flex items-center gap-2 text-gray-500">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
									<Hash className="h-4 w-4" aria-hidden />
								</div>
								<span className="text-[11px] font-bold uppercase tracking-wide">{t("aml.risk.detailIdsSection")}</span>
							</div>
							<dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
								<div>
									<dt className="text-xs font-medium text-gray-500">{t("aml.risk.detailProfileId")}</dt>
									<dd className="mt-0.5 font-semibold tabular-nums text-gray-900">{profile.id}</dd>
								</div>
								<div>
									<dt className="text-xs font-medium text-gray-500">{t("aml.risk.detailClientId")}</dt>
									<dd className="mt-0.5 font-semibold tabular-nums text-gray-900">{profile.clientId}</dd>
								</div>
							</dl>
						</div>

						<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
							<div className="mb-3 flex items-center gap-2 text-gray-500">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
									<User className="h-4 w-4" aria-hidden />
								</div>
								<span className="text-[11px] font-bold uppercase tracking-wide">{t("aml.risk.detailOriginSection")}</span>
							</div>
							<p className="text-sm leading-relaxed text-gray-800">
								<span className="font-medium text-gray-600">{t("aml.risk.by")}:</span> {profile.computedBy ?? "—"}
							</p>
							<p className="mt-2 text-sm leading-relaxed text-gray-800">
								<span className="font-medium text-gray-600">{t("aml.risk.computedAt")}:</span> {computedLabel}
							</p>
						</div>

						<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
							<div className="mb-3 flex items-center gap-2 text-gray-500">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
									<Braces className="h-4 w-4" aria-hidden />
								</div>
								<span className="text-[11px] font-bold uppercase tracking-wide">{t("aml.risk.factors")}</span>
							</div>
							{factorsFormatted ? (
								<pre className="max-h-[min(42vh,380px)] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-gray-100 bg-gray-50/90 p-3 font-mono text-xs leading-relaxed text-gray-800 ring-1 ring-gray-900/[0.03]">
									{factorsFormatted}
								</pre>
							) : (
								<p className="text-sm text-gray-500">{t("aml.risk.factorsNone")}</p>
							)}
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-6">
						<Button type="button" variant="outline" onClick={onClose} className="min-w-[7rem] border-gray-200">
							{t("aml.risk.modalClose")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function AmlForceEddModal({
	clientId,
	riskLevel,
	diligenceLevel,
	rationale,
	loading,
	error,
	onRiskLevelChange,
	onDiligenceLevelChange,
	onRationaleChange,
	onSubmit,
	onClose
}: {
	clientId: number;
	riskLevel: AmlRiskLevel;
	diligenceLevel: AmlDiligenceLevel;
	rationale: string;
	loading: boolean;
	error: string | null;
	onRiskLevelChange: (level: AmlRiskLevel) => void;
	onDiligenceLevelChange: (level: AmlDiligenceLevel) => void;
	onRationaleChange: (value: string) => void;
	onSubmit: () => void;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const rationaleValid = rationale.trim().length >= FORCE_RATIONALE_MIN;

	useEffect(() => {
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !loading) onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose, loading]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="aml-force-edd-modal-title">
			<button
				type="button"
				className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
				aria-label={t("aml.risk.modalClose")}
				onClick={onClose}
				disabled={loading}
			/>
			<div className="relative z-10 flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
				<header className="shrink-0 border-b border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 px-5 py-4 sm:px-6">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1 space-y-1.5">
							<h2 id="aml-force-edd-modal-title" className="text-lg font-semibold text-violet-950">
								{t("aml.risk.eddForceModalTitle")}
							</h2>
							<p className="text-sm text-violet-900/90">
								{t("aml.risk.detailClientLabel")}: <span className="font-semibold tabular-nums">{clientId}</span>
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="shrink-0 rounded-lg p-2 text-violet-800 transition-colors hover:bg-violet-200/70 hover:text-violet-950 disabled:opacity-50"
							aria-label={t("aml.risk.modalClose")}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</header>

				<div className="flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-gray-50/95 to-white">
					<div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
						{error ? (
							<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
								{error}
							</div>
						) : null}
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="aml-force-edd-risk-level">
									{t("aml.risk.level")}
								</label>
								<select
									id="aml-force-edd-risk-level"
									className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
									value={riskLevel}
									onChange={(e) => onRiskLevelChange(e.target.value as AmlRiskLevel)}
									disabled={loading}
								>
									{RISK_LEVELS.map((level) => (
										<option key={level} value={level}>
											{level}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="aml-force-edd-diligence">
									{t("aml.risk.diligence")}
								</label>
								<select
									id="aml-force-edd-diligence"
									className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
									value={diligenceLevel}
									onChange={(e) => onDiligenceLevelChange(e.target.value as AmlDiligenceLevel)}
									disabled={loading}
								>
									{DILIGENCE_LEVELS.map((level) => (
										<option key={level} value={level}>
											{level}
										</option>
									))}
								</select>
							</div>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="aml-force-edd-rationale">
								{t("aml.risk.forceRationale")}
							</label>
							<textarea
								id="aml-force-edd-rationale"
								className="min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
								value={rationale}
								onChange={(e) => onRationaleChange(e.target.value)}
								placeholder={t("aml.risk.forceRationalePlaceholder", { min: FORCE_RATIONALE_MIN })}
								disabled={loading}
								maxLength={2000}
							/>
							<p className="mt-1 text-xs text-gray-500">
								{t("aml.risk.forceRationaleCount", {
									count: rationale.trim().length,
									min: FORCE_RATIONALE_MIN
								})}
							</p>
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-6">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading} className="min-w-[7rem] border-gray-200">
							{t("aml.risk.modalClose")}
						</Button>
						<Button type="button" onClick={onSubmit} disabled={loading || !rationaleValid} className="min-w-[7rem]">
							{t("aml.risk.forceSubmit")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function AmlRiskProfilesInner() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const clientIdFromUrl = searchParams.get("clientId");
	const resolvedClientId = useMemo(() => {
		const p = clientIdFromUrl?.trim() ?? "";
		if (!p || !/^\d+$/.test(p)) return null;
		return Number(p);
	}, [clientIdFromUrl]);
	const [rows, setRows] = useState<AmlRiskProfileDto[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState(10);
	const [detailProfile, setDetailProfile] = useState<AmlRiskProfileDto | null>(null);
	const [forceRiskLevel, setForceRiskLevel] = useState<AmlRiskLevel>("MEDIUM");
	const [forceDiligenceLevel, setForceDiligenceLevel] = useState<AmlDiligenceLevel>("ENHANCED");
	const [forceRationale, setForceRationale] = useState("");
	const [forceModalOpen, setForceModalOpen] = useState(false);
	const [forceSubmitting, setForceSubmitting] = useState(false);
	const [forceModalError, setForceModalError] = useState<string | null>(null);

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

	const totalRows = rows.length;
	const totalPages = totalRows === 0 ? 0 : Math.ceil(totalRows / pageSize);

	const paginatedRows = useMemo(() => {
		const start = page * pageSize;
		return rows.slice(start, start + pageSize);
	}, [rows, page, pageSize]);

	const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;
	useEffect(() => {
		if (page !== safePage) setPage(safePage);
	}, [page, safePage]);

	useEffect(() => {
		setPage(0);
	}, [rows]);

	useEffect(() => {
		if (resolvedClientId === null) {
			setRows([]);
			return;
		}
		let cancelled = false;
		void (async () => {
			setLoading(true);
			setError(null);
			try {
				const list = await amlApi.listRiskProfiles(resolvedClientId);
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
	}, [resolvedClientId]);

	async function recompute() {
		if (resolvedClientId === null) {
			setError(t("aml.risk.clientRequired"));
			return;
		}
		const id = resolvedClientId;
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

	const closeForceModal = useCallback(() => {
		if (forceSubmitting) return;
		setForceModalOpen(false);
		setForceModalError(null);
	}, [forceSubmitting]);

	async function forceProfile() {
		if (resolvedClientId === null) {
			setForceModalError(t("aml.risk.clientRequired"));
			return;
		}
		const id = resolvedClientId;
		const rationale = forceRationale.trim();
		if (rationale.length < FORCE_RATIONALE_MIN) {
			setForceModalError(t("aml.risk.forceRationaleTooShort", { min: FORCE_RATIONALE_MIN }));
			return;
		}
		setForceSubmitting(true);
		setForceModalError(null);
		try {
			const payload: ForceAmlRiskProfileRequest = {
				riskLevel: forceRiskLevel,
				diligenceLevel: forceDiligenceLevel,
				rationale
			};
			await amlApi.forceRiskProfile(id, payload);
			const list = await amlApi.listRiskProfiles(id);
			setRows(list ?? []);
			setForceRationale("");
			setForceModalOpen(false);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("show-toast", {
						detail: { message: t("aml.risk.forceDone"), type: "success" }
					})
				);
			}
		} catch (e: unknown) {
			setForceModalError(e instanceof Error ? e.message : "Error");
		} finally {
			setForceSubmitting(false);
		}
	}

	const detailFactorsFormatted = useMemo(
		() => (detailProfile ? formatFactorsJson(detailProfile.factorsJson) : null),
		[detailProfile]
	);

	const closeRiskDetailModal = useCallback(() => setDetailProfile(null), []);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("aml.risk.title")}</h1>
					<p className="text-gray-600 mt-1">
						{resolvedClientId !== null
							? t("aml.risk.subtitleForClient", { clientId: resolvedClientId })
							: t("aml.risk.subtitle")}
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button
						type="button"
						variant="outline"
						className="flex items-center gap-2"
						onClick={() => void recompute()}
						disabled={loading || resolvedClientId === null}
					>
						<RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
						{t("aml.risk.recompute")}
					</Button>
					{resolvedClientId !== null ? (
						<Link href={`/customers/${resolvedClientId}`}>
							<Button type="button" variant="outline" className="flex items-center gap-2">
								<User className="h-4 w-4 shrink-0" aria-hidden />
								{t("aml.risk.openClient")}
							</Button>
						</Link>
					) : (
						<Link href="/customers">
							<Button type="button" variant="outline" className="flex items-center gap-2">
								<User className="h-4 w-4 shrink-0" aria-hidden />
								{t("aml.risk.openCustomers")}
							</Button>
						</Link>
					)}
					<Button
						type="button"
						className="flex items-center gap-2"
						onClick={() => {
							setForceModalError(null);
							setForceModalOpen(true);
						}}
						disabled={resolvedClientId === null}
					>
						<Shield className="h-5 w-5 shrink-0" aria-hidden />
						{t("aml.risk.eddForce")}
					</Button>
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
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("aml.risk.computedAt")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("aml.risk.level")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("aml.risk.score")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("aml.risk.diligence")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("aml.risk.active")}</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t("aml.risk.by")}</th>
									<th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t("common.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{rows.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-6 py-12 text-center text-gray-500">
											{t("aml.risk.empty")}
										</td>
									</tr>
								) : (
									paginatedRows.map((r) => (
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
											<td className="px-6 py-4 text-right whitespace-nowrap">
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="inline-flex items-center gap-1.5"
													onClick={() => setDetailProfile(r)}
												>
													<Eye className="h-4 w-4 shrink-0 text-gray-600" aria-hidden />
													{t("aml.risk.view")}
												</Button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{rows.length > 0 ? (
						<TablePagination
							page={safePage}
							totalPages={totalPages}
							totalElements={totalRows}
							pageSize={pageSize}
							onPageChange={setPage}
							resultsLabel={t("aml.risk.paginationProfiles")}
							showFirstLast
							sizeOptions={OPS_TABLE_PAGE_SIZE_OPTIONS}
							size={pageSize}
							onSizeChange={(s) => {
								setPageSize(s);
								setPage(0);
							}}
							className="!border-t-gray-200 !bg-gray-50/90 [&_.text-ops-fg]:text-gray-800 [&_.text-ops-fg-muted]:text-gray-600 [&_select]:border-gray-300 [&_select]:bg-white"
						/>
					) : null}
				</div>
			)}

			{detailProfile ? (
				<AmlRiskProfileDetailModal
					profile={detailProfile}
					factorsFormatted={detailFactorsFormatted}
					onClose={closeRiskDetailModal}
				/>
			) : null}

			{forceModalOpen && resolvedClientId !== null ? (
				<AmlForceEddModal
					clientId={resolvedClientId}
					riskLevel={forceRiskLevel}
					diligenceLevel={forceDiligenceLevel}
					rationale={forceRationale}
					loading={forceSubmitting}
					error={forceModalError}
					onRiskLevelChange={setForceRiskLevel}
					onDiligenceLevelChange={setForceDiligenceLevel}
					onRationaleChange={setForceRationale}
					onSubmit={() => void forceProfile()}
					onClose={closeForceModal}
				/>
			) : null}
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
