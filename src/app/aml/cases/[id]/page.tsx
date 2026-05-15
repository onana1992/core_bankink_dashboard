"use client";

import type { ElementType } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
	ArrowLeft,
	Bell,
	CalendarClock,
	FileWarning,
	ListChecks,
	ListTodo,
	Lock,
	MessageSquare,
	RefreshCw,
	Tag,
	User,
	UserCircle
} from "lucide-react";
import { amlApi } from "@/lib/api";
import type { AmlCaseDetailResponse, AmlCaseStatus } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

const CASE_STATUSES: AmlCaseStatus[] = ["OPEN", "IN_REVIEW", "ESCALATED", "CLOSED"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

const TEXTAREA_CLASS =
	"w-full min-h-[88px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500";

function caseStatusVariant(s: AmlCaseStatus): "neutral" | "success" | "warning" | "danger" | "info" {
	switch (s) {
		case "CLOSED":
			return "success";
		case "OPEN":
			return "info";
		case "IN_REVIEW":
			return "warning";
		case "ESCALATED":
			return "danger";
		default:
			return "neutral";
	}
}

function formatDateTime(iso: string | null | undefined, lang: string): string {
	if (!iso) return "—";
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		const loc = lang.startsWith("fr") ? "fr-FR" : "en-US";
		return d.toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" });
	} catch {
		return "—";
	}
}

function MetaField({
	label,
	icon: Icon,
	children,
	className = ""
}: {
	label: string;
	icon: ElementType;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`rounded-xl border border-gray-200/90 bg-gradient-to-b from-gray-50/90 to-white p-4 shadow-sm ${className}`}>
			<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
				<Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
				{label}
			</div>
			<div className="mt-2 min-h-[1.25rem] text-sm font-medium text-gray-900">{children}</div>
		</div>
	);
}

export default function AmlCaseDetailPage() {
	const { t, i18n } = useTranslation();
	const params = useParams();
	const id = params?.id as string;
	const [c, setC] = useState<AmlCaseDetailResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [noteBody, setNoteBody] = useState("");
	const [nextStatus, setNextStatus] = useState<AmlCaseStatus | "">("");
	const [statusComment, setStatusComment] = useState("");
	const [outcomeCode, setOutcomeCode] = useState("");
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const data = await amlApi.getCase(id);
			setC(data);
			setNextStatus(data.status);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
			setC(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	async function addNote(e: React.FormEvent) {
		e.preventDefault();
		if (!noteBody.trim()) return;
		setBusy(true);
		try {
			await amlApi.addCaseNote(id, { body: noteBody.trim() });
			setNoteBody("");
			await load();
		} finally {
			setBusy(false);
		}
	}

	async function patchStatus(e: React.FormEvent) {
		e.preventDefault();
		if (!nextStatus || !c || nextStatus === c.status) return;
		setBusy(true);
		try {
			await amlApi.patchCaseStatus(id, {
				status: nextStatus,
				comment: statusComment.trim() || undefined,
				outcomeCode: outcomeCode.trim() || undefined
			});
			setStatusComment("");
			await load();
		} finally {
			setBusy(false);
		}
	}

	async function declaration() {
		setBusy(true);
		setError(null);
		try {
			const r = await amlApi.createDeclaration(id);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("show-toast", {
						detail: { message: `${t("aml.cases.declarationCreated")} #${r.id}`, type: "success" }
					})
				);
			}
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
		} finally {
			setBusy(false);
		}
	}

	const backLinkClass =
		"inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900";

	const lang = i18n.language || "fr";

	const statusDirty = Boolean(c && nextStatus && nextStatus !== c.status);

	if (loading && !c) {
		return (
			<div className="w-full min-w-0">
				<div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			</div>
		);
	}

	if (!c) {
		return (
			<div className="w-full min-w-0 space-y-6">
				{error ? (
					<div className="flex items-center gap-2 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3 text-red-800">
						<svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				) : null}
				<Link href="/aml/cases" className={backLinkClass}>
					<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
					{t("aml.cases.back")}
				</Link>
			</div>
		);
	}

	return (
		<div className="w-full min-w-0 space-y-6">
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0 flex-1 space-y-4">
						<Link href="/aml/cases" className={backLinkClass}>
							<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
							{t("aml.cases.back")}
						</Link>
						<div className="flex flex-wrap items-center gap-2">
							<span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-600">#{c.id}</span>
							<Badge variant={caseStatusVariant(c.status)}>{c.status}</Badge>
							<Badge variant="neutral">AML</Badge>
						</div>
						<div>
							<h1 className="font-mono text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{c.publicRef}</h1>
							<p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
								{t("aml.detail.client")}:{" "}
								<Link href={`/customers/${c.clientId}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
									{c.clientId}
								</Link>
							</p>
						</div>
					</div>
					<div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
						<Button
							type="button"
							variant="outline"
							className="flex items-center justify-center gap-2"
							onClick={() => void load()}
							disabled={loading || busy}
						>
							<RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
							{t("common.refresh")}
						</Button>
					</div>
				</div>
			</div>

			{error ? (
				<div className="flex items-center gap-2 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3 text-red-800">
					<svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			) : null}

			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/95 px-5 py-3.5">
					<ListTodo className="h-4 w-4 text-gray-500" aria-hidden />
					<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.cases.detailContext")}</h2>
				</div>
				<div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
					<MetaField label={t("aml.detail.client")} icon={User}>
						<Link href={`/customers/${c.clientId}`} className="text-blue-600 hover:text-blue-800 hover:underline">
							{c.clientId}
						</Link>
					</MetaField>
					<MetaField label={t("aml.cases.columnOwner")} icon={UserCircle}>
						{c.ownerUserId != null ? (
							<span className="font-mono text-xs font-normal">{c.ownerUserId}</span>
						) : (
							<span className="font-normal text-gray-400">—</span>
						)}
					</MetaField>
					<MetaField label={t("aml.cases.columnOpened")} icon={CalendarClock}>
						<span className="font-normal">{formatDateTime(c.openedAt, lang)}</span>
					</MetaField>
					<MetaField label={t("aml.cases.columnClosed")} icon={Lock}>
						<span className="font-normal">{formatDateTime(c.closedAt, lang)}</span>
					</MetaField>
					<MetaField label={t("aml.cases.outcomeCode")} icon={Tag} className="sm:col-span-2 lg:col-span-1">
						{c.outcomeCode ? (
							<span className="font-mono text-xs font-normal">{c.outcomeCode}</span>
						) : (
							<span className="font-normal text-gray-400">—</span>
						)}
					</MetaField>
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/95 px-5 py-3.5">
					<Bell className="h-4 w-4 text-gray-500" aria-hidden />
					<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.cases.linkedAlerts")}</h2>
				</div>
				<div className="p-5">
					{c.alertIds.length === 0 ? (
						<p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center text-sm text-gray-500">{t("aml.empty")}</p>
					) : (
						<ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
							{c.alertIds.map((aid) => (
								<li key={aid}>
									<Link
										href={`/aml/alerts/${aid}`}
										className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-gray-50"
									>
										<span className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
											{t("aml.table.ref")} #{aid}
										</span>
										<span className="font-mono text-xs text-gray-400">{aid}</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/95 px-5 py-3.5">
					<MessageSquare className="h-4 w-4 text-gray-500" aria-hidden />
					<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.cases.notes")}</h2>
				</div>
				<div className="space-y-4 p-5">
					{(c.notes ?? []).length === 0 ? (
						<p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center text-sm text-gray-500">{t("aml.empty")}</p>
					) : (
						<ul className="space-y-3">
							{(c.notes ?? []).map((n) => (
								<li key={n.id} className="rounded-xl border border-gray-200/90 bg-gradient-to-b from-gray-50/80 to-white p-4 shadow-sm">
									<div className="text-xs text-gray-500">
										{t("aml.cases.author")} {n.authorUserId} — {n.createdAt ? formatDateTime(n.createdAt, lang) : ""}
									</div>
									<p className="mt-2 whitespace-pre-wrap text-sm font-normal text-gray-900">{n.body}</p>
								</li>
							))}
						</ul>
					)}
					<form onSubmit={addNote} className="space-y-3 border-t border-gray-100 pt-5">
						<textarea
							className={TEXTAREA_CLASS}
							value={noteBody}
							onChange={(e) => setNoteBody(e.target.value)}
							placeholder={t("aml.cases.notePlaceholder")}
							aria-label={t("aml.cases.notePlaceholder")}
						/>
						<Button type="submit" size="sm" disabled={busy}>
							{t("aml.cases.addNote")}
						</Button>
					</form>
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/95 px-5 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<div className="flex min-w-0 items-center gap-2">
						<ListChecks className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
						<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.cases.statusSection")}</h2>
					</div>
					<div className="flex flex-wrap items-center gap-2 sm:justify-end">
						<span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("aml.cases.statusStoredLabel")}</span>
						<Badge variant={caseStatusVariant(c.status)}>{c.status}</Badge>
					</div>
				</div>

				<form onSubmit={patchStatus} className="space-y-5 p-5">
					<p className="max-w-3xl text-sm leading-relaxed text-gray-600">{t("aml.cases.statusCardIntro")}</p>

					<div className="space-y-5 rounded-xl border border-gray-200 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm ring-1 ring-gray-100/90">
						<div className={`gap-5 lg:gap-8 ${statusDirty ? "grid lg:grid-cols-2 lg:items-start" : ""}`}>
							<div className="space-y-2">
								<label className="block text-sm font-medium text-gray-700" htmlFor="aml-case-status">
									{t("aml.filters.status")}
								</label>
								<select
									id="aml-case-status"
									className={SELECT_CLASS}
									value={nextStatus || c.status}
									onChange={(e) => setNextStatus(e.target.value as AmlCaseStatus)}
								>
									{CASE_STATUSES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>
							{statusDirty ? (
								<div className="flex min-h-[2.5rem] flex-col justify-center lg:justify-start lg:pt-7">
									<div className="rounded-lg border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/60 px-3 py-2.5 text-xs leading-snug text-amber-950 shadow-sm">
										<span className="font-semibold">{t("aml.cases.statusPendingChange")}</span>
										<span className="mt-1 block font-mono text-[11px] font-normal text-amber-900/90">
											{c.status} → {nextStatus}
										</span>
									</div>
								</div>
							) : null}
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700" htmlFor="aml-case-status-comment">
								{t("aml.cases.statusComment")}
							</label>
							<textarea
								id="aml-case-status-comment"
								className={`${TEXTAREA_CLASS} min-h-[72px]`}
								placeholder={t("aml.cases.statusComment")}
								value={statusComment}
								onChange={(e) => setStatusComment(e.target.value)}
								rows={3}
							/>
						</div>

						<div className="space-y-3 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50/90 to-slate-50/30 p-4 ring-1 ring-blue-100/60">
							<label className="flex items-center gap-2 text-sm font-medium text-gray-800" htmlFor="aml-case-outcome">
								<Tag className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
								{t("aml.cases.outcomeCode")}
							</label>
							<Input
								id="aml-case-outcome"
								className="h-10 max-w-md bg-white"
								placeholder={t("aml.cases.outcomeCode")}
								value={outcomeCode}
								onChange={(e) => setOutcomeCode(e.target.value)}
							/>
							<p className="text-xs leading-relaxed text-blue-950/80">{t("aml.cases.outcomeCodeHint")}</p>
						</div>

						<div className="flex flex-wrap gap-3 border-t border-gray-200/90 pt-5">
							<Button type="submit" className="h-10 min-w-[10rem]" disabled={busy || !statusDirty}>
								{t("aml.cases.updateStatus")}
							</Button>
						</div>
					</div>
				</form>
			</div>

			<div className="overflow-hidden rounded-2xl border border-amber-200/90 bg-white shadow-sm ring-1 ring-amber-100/80">
				<div className="flex items-center gap-2 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/70 px-5 py-3.5">
					<FileWarning className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
					<h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">{t("aml.cases.declarationSection")}</h2>
				</div>
				<div className="space-y-4 p-5">
					<p className="text-sm leading-relaxed text-gray-700">{t("aml.cases.declarationHint")}</p>
					<Button type="button" variant="secondary" onClick={declaration} disabled={busy}>
						{t("aml.cases.createDeclaration")}
					</Button>
				</div>
			</div>
		</div>
	);
}
