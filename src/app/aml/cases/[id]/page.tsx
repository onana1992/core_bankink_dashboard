"use client";

import type { ElementType } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
	ArrowLeft,
	CalendarClock,
	ExternalLink,
	FileWarning,
	ListChecks,
	Lock,
	MessageSquare,
	RefreshCw,
	Shield,
	Tag,
	User,
	UserCircle
} from "lucide-react";
import { amlApi } from "@/lib/api";
import type {
	AmlAlertResponse,
	AmlAlertSeverity,
	AmlCaseDetailResponse,
	AmlCaseStatus,
	AmlCaseStatusHistoryResponse,
	AmlDeclarationRecordResponse
} from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import {
	OPS_CARD_HEADER,
	OPS_CARD_SHELL,
	OPS_PAGE_STACK,
	OPS_TABLE_WRAP,
	OPS_TABLE,
	OPS_THEAD,
	OPS_TH,
	OPS_TD,
	OPS_TR_HOVER,
	OpsPageHeader,
	OpsInlineAlert
} from "@/components/ops";

const CASE_STATUSES: AmlCaseStatus[] = ["OPEN", "IN_REVIEW", "ESCALATED", "CLOSED"];

type TabId = "synthesis" | "notes" | "status" | "declaration";

const STATUS_SELECT_CLASS =
	"w-full h-10 px-3 text-sm rounded-ops-md border border-ops-border bg-ops-surface text-ops-fg focus:outline-none focus:ring-2 focus:ring-ops-ring/30 focus:border-ops-ring";

const STATUS_TEXTAREA_CLASS =
	"w-full min-h-[72px] rounded-ops-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-fg outline-none focus:border-ops-ring focus:ring-2 focus:ring-ops-ring/25";

const NOTE_TEXTAREA_CLASS =
	"w-full min-h-[88px] rounded-ops-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-fg outline-none focus:border-ops-ring focus:ring-2 focus:ring-ops-ring/25";

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

function alertSeverityVariant(s: AmlAlertSeverity): "neutral" | "info" | "warning" | "danger" {
	if (s === "CRITICAL" || s === "HIGH") return "danger";
	if (s === "MEDIUM") return "warning";
	if (s === "LOW" || s === "INFO") return "info";
	return "neutral";
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
		<div className={`rounded-ops-xl border border-ops-border bg-ops-surface-muted/40 p-4 shadow-sm ${className}`}>
			<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ops-fg-muted">
				<Icon className="h-3.5 w-3.5 shrink-0 text-ops-fg-muted" aria-hidden />
				{label}
			</div>
			<div className="mt-2 min-h-[1.25rem] text-sm font-medium text-ops-fg">{children}</div>
		</div>
	);
}

export default function AmlCaseDetailPage() {
	const { t, i18n } = useTranslation();
	const params = useParams();
	const id = params?.id as string;
	const [activeTab, setActiveTab] = useState<TabId>("synthesis");

	const [c, setC] = useState<AmlCaseDetailResponse | null>(null);
	const [statusHistory, setStatusHistory] = useState<AmlCaseStatusHistoryResponse[]>([]);
	const [declarations, setDeclarations] = useState<AmlDeclarationRecordResponse[]>([]);
	const [linkedAlertRows, setLinkedAlertRows] = useState<Array<{ alertId: number; alert: AmlAlertResponse | null }>>([]);
	const [linkedAlertsLoading, setLinkedAlertsLoading] = useState(false);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [noteBody, setNoteBody] = useState("");
	const [nextStatus, setNextStatus] = useState<AmlCaseStatus | "">("");
	const [statusComment, setStatusComment] = useState("");
	const [outcomeCode, setOutcomeCode] = useState("");
	const [busy, setBusy] = useState(false);
	const [statusEditorOpen, setStatusEditorOpen] = useState(false);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const [data, hist, decls] = await Promise.all([
				amlApi.getCase(id),
				amlApi.getCaseStatusHistory(id),
				amlApi.getCaseDeclarations(id)
			]);
			setC(data);
			setNextStatus(data.status);
			setStatusHistory(hist);
			setDeclarations(decls);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
			setC(null);
			setStatusHistory([]);
			setDeclarations([]);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		const ids = c?.alertIds;
		if (!ids?.length) {
			setLinkedAlertRows([]);
			setLinkedAlertsLoading(false);
			return;
		}
		let cancelled = false;
		setLinkedAlertsLoading(true);
		void Promise.all(
			ids.map(async (alertId) => ({
				alertId,
				alert: await amlApi.getAlert(alertId).catch(() => null)
			}))
		).then((rows) => {
			if (!cancelled) {
				setLinkedAlertRows(rows);
				setLinkedAlertsLoading(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [c?.id, c?.alertIds]);

	useEffect(() => {
		if (activeTab !== "status") setStatusEditorOpen(false);
	}, [activeTab]);

	useEffect(() => {
		if (c?.status === "CLOSED") setStatusEditorOpen(false);
	}, [c?.status]);

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
				outcomeCode: nextStatus === "CLOSED" ? outcomeCode.trim() || undefined : undefined
			});
			setStatusComment("");
			setOutcomeCode("");
			await load();
			setStatusEditorOpen(false);
		} finally {
			setBusy(false);
		}
	}

	async function declaration() {
		setBusy(true);
		setError(null);
		try {
			await amlApi.createDeclaration(id);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("show-toast", {
						detail: { message: `${t("aml.cases.declarationCreated")}`, type: "success" }
					})
				);
			}
			await load();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
		} finally {
			setBusy(false);
		}
	}

	const lang = i18n.language || "fr";
	const statusDirty = Boolean(c && nextStatus && nextStatus !== c.status);
	const isClosed = c?.status === "CLOSED";
	const selectedTargetStatus: AmlCaseStatus | "" = nextStatus || c?.status || "";
	const showOutcomeCodeField = !isClosed && selectedTargetStatus === "CLOSED";

	const tabs: { id: TabId; label: string }[] = [
		{ id: "synthesis", label: t("aml.cases.detailTabSynthesis") },
		{ id: "notes", label: t("aml.cases.detailTabNotes") },
		{ id: "status", label: t("aml.cases.detailTabStatus") },
		{ id: "declaration", label: t("aml.cases.detailTabDeclaration") }
	];

	if (loading && !c) {
		return (
			<div className={OPS_PAGE_STACK}>
				<div className="rounded-ops-xl border border-ops-border bg-ops-surface p-12 text-center shadow-ops-card">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-ops-ring" />
					<p className="mt-4 text-ops-fg-muted">{t("aml.loading")}</p>
				</div>
			</div>
		);
	}

	if (!c) {
		return (
			<div className={OPS_PAGE_STACK}>
				{error ? <OpsInlineAlert variant="error">{error}</OpsInlineAlert> : null}
				<Link
					href="/aml/cases"
					className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-sm font-medium text-ops-fg-muted transition hover:border-ops-border hover:bg-ops-surface-muted hover:text-ops-fg"
				>
					<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
					{t("aml.cases.back")}
				</Link>
			</div>
		);
	}

	return (
		<div className={OPS_PAGE_STACK}>
			<OpsPageHeader
				title={
					<span className="font-mono tracking-tight">
						{c.publicRef}
						<span className="ml-2 text-sm font-normal text-ops-fg-muted">#{c.id}</span>
					</span>
				}
				description={
					<span>
						{t("aml.detail.client")}:{" "}
						<Link href={`/customers/${c.clientId}`} className="font-medium text-ops-ring hover:underline">
							{c.clientId}
						</Link>
					</span>
				}
				actions={
					<div className="flex flex-row flex-wrap items-center gap-2">
						<Link
							href="/aml/cases"
							className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-ops-border bg-ops-surface px-3 text-sm font-medium text-ops-fg transition hover:bg-ops-surface-muted"
						>
							<ArrowLeft className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
							{t("aml.cases.back")}
						</Link>
						<Button
							type="button"
							variant="outline"
							className="flex shrink-0 items-center justify-center gap-2"
							onClick={() => void load()}
							disabled={loading || busy}
						>
							<RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
							{t("common.refresh")}
						</Button>
						<Badge variant={caseStatusVariant(c.status)}>{c.status}</Badge>
					</div>
				}
			/>

			{error ? <OpsInlineAlert variant="error">{error}</OpsInlineAlert> : null}

			<div className={OPS_CARD_SHELL}>
				<nav
					className="flex gap-1 overflow-x-auto border-b border-ops-border bg-ops-surface-muted px-2 py-2 sm:px-3"
					aria-label={t("aml.cases.detailContext")}
				>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap shrink-0 ${
								activeTab === tab.id
									? "bg-ops-surface text-ops-fg shadow-sm ring-1 ring-ops-border"
									: "text-ops-fg-muted hover:bg-ops-surface hover:text-ops-fg"
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>

				<div className="min-h-[280px] bg-ops-surface p-4 sm:p-6 lg:p-8">
					{activeTab === "synthesis" && (
						<div className="space-y-6">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								<MetaField label={t("aml.detail.client")} icon={User}>
									<Link href={`/customers/${c.clientId}`} className="text-ops-ring hover:underline">
										{c.clientId}
									</Link>
								</MetaField>
								<MetaField label={t("aml.cases.columnOwner")} icon={UserCircle}>
									{c.ownerUsername?.trim() ? (
										<span className="text-sm font-medium text-ops-fg">{c.ownerUsername}</span>
									) : (
										<span className="font-normal text-ops-fg-muted">—</span>
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
										<span className="font-normal text-ops-fg-muted">—</span>
									)}
								</MetaField>
							</div>

							<div>
								<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ops-fg-muted">
									<Shield className="h-4 w-4 shrink-0" aria-hidden />
									{t("aml.cases.alertsTableTitle")}
								</h3>
								{linkedAlertsLoading ? (
									<p className="text-sm text-ops-fg-muted">{t("aml.loading")}</p>
								) : linkedAlertRows.length === 0 ? (
									<p className="rounded-ops-lg border border-dashed border-ops-border bg-ops-surface-muted/40 py-8 text-center text-sm text-ops-fg-muted">
										{t("aml.empty")}
									</p>
								) : (
									<div className={OPS_TABLE_WRAP}>
										<table className={OPS_TABLE}>
											<thead className={OPS_THEAD}>
												<tr>
													<th className={OPS_TH}>{t("aml.cases.alertsColId")}</th>
													<th className={OPS_TH}>{t("aml.cases.alertsColRef")}</th>
													<th className={`${OPS_TH} max-w-[14rem]`}>{t("aml.cases.alertsColTitle")}</th>
													<th className={OPS_TH}>{t("aml.cases.alertsColSeverity")}</th>
													<th className={OPS_TH}>{t("aml.cases.alertsColStatus")}</th>
													<th className={`${OPS_TH} text-right`}>{t("aml.cases.alertsColActions")}</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-ops-border bg-ops-surface">
												{linkedAlertRows.map(({ alertId, alert }) => (
													<tr key={alertId} className={OPS_TR_HOVER}>
														<td className={`${OPS_TD} font-mono`}>{alertId}</td>
														<td className={OPS_TD}>
															{alert ? (
																<span className="font-mono text-xs">{alert.publicRef}</span>
															) : (
																<span className="text-xs text-amber-700">{t("aml.cases.alertsLoadError")}</span>
															)}
														</td>
														<td className={`${OPS_TD} max-w-[14rem] truncate whitespace-normal`}>
															{alert?.title ?? "—"}
														</td>
														<td className={OPS_TD}>
															{alert ? (
																<Badge variant={alertSeverityVariant(alert.severity)}>{alert.severity}</Badge>
															) : (
																"—"
															)}
														</td>
														<td className={OPS_TD}>{alert ? <Badge variant="neutral">{alert.status}</Badge> : "—"}</td>
														<td className={`${OPS_TD} text-right`}>
															<Link
																href={`/aml/alerts/${alertId}`}
																className="inline-flex items-center gap-1 text-sm font-medium text-ops-ring hover:underline"
															>
																<ExternalLink className="h-3.5 w-3.5" aria-hidden />
																{t("aml.table.view")}
															</Link>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>
					)}

					{activeTab === "notes" && (
						<div className="space-y-6">
							{(c.notes ?? []).length === 0 ? (
								<p className="rounded-ops-lg border border-dashed border-ops-border bg-ops-surface-muted/40 py-8 text-center text-sm text-ops-fg-muted">
									{t("aml.empty")}
								</p>
							) : (
								<ul className="space-y-3">
									{(c.notes ?? []).map((n) => (
										<li
											key={n.id}
											className="rounded-ops-xl border border-ops-border bg-ops-surface-muted/30 p-4 shadow-sm"
										>
											<div className="flex items-center gap-2 text-xs text-ops-fg-muted">
												<MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
												<span className="font-medium text-ops-fg">{n.authorUsername?.trim() || "—"}</span>
												<span aria-hidden>—</span>
												<span>{n.createdAt ? formatDateTime(n.createdAt, lang) : ""}</span>
											</div>
											<p className="mt-2 whitespace-pre-wrap text-sm text-ops-fg">{n.body}</p>
										</li>
									))}
								</ul>
							)}
							{isClosed ? (
								<OpsInlineAlert variant="warning">{t("aml.cases.caseClosedNotes")}</OpsInlineAlert>
							) : (
								<form onSubmit={addNote} className="space-y-3 border-t border-ops-border pt-6">
									<label className="block text-sm font-medium text-ops-fg" htmlFor="aml-case-note">
										{t("aml.cases.notePlaceholder")}
									</label>
									<textarea
										id="aml-case-note"
										className={NOTE_TEXTAREA_CLASS}
										value={noteBody}
										onChange={(e) => setNoteBody(e.target.value)}
										placeholder={t("aml.cases.notePlaceholder")}
										aria-label={t("aml.cases.notePlaceholder")}
									/>
									<Button type="submit" size="sm" disabled={busy}>
										{t("aml.cases.addNote")}
									</Button>
								</form>
							)}
						</div>
					)}

					{activeTab === "status" && (
						<div className="space-y-8">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
										{t("aml.cases.statusStoredLabel")}
									</span>
									<Badge variant={caseStatusVariant(c.status)}>{c.status}</Badge>
								</div>
								{!isClosed && !statusEditorOpen ? (
									<Button type="button" variant="secondary" onClick={() => setStatusEditorOpen(true)} disabled={busy}>
										{t("aml.cases.updateStatus")}
									</Button>
								) : null}
							</div>

							{!isClosed && statusEditorOpen ? (
								<div className={OPS_CARD_SHELL}>
									<div className={OPS_CARD_HEADER}>
										<h3 className="text-sm font-semibold tracking-tight text-ops-fg">{t("aml.cases.statusSection")}</h3>
									</div>
									<form onSubmit={patchStatus} className="space-y-6 bg-ops-surface px-5 py-6 sm:px-6">
										<div className={`gap-5 lg:gap-8 ${statusDirty ? "grid lg:grid-cols-2 lg:items-start" : ""}`}>
											<div className="space-y-2">
												<label className="block text-sm font-medium text-ops-fg" htmlFor="aml-case-status">
													{t("aml.filters.status")}
												</label>
												<select
													id="aml-case-status"
													className={STATUS_SELECT_CLASS}
													value={nextStatus || c.status}
													onChange={(e) => {
														const v = e.target.value as AmlCaseStatus;
														setNextStatus(v);
														if (v !== "CLOSED") setOutcomeCode("");
													}}
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
													<div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50">
														<span className="text-xs font-semibold">{t("aml.cases.statusPendingChange")}</span>
														<span className="mt-1 block font-mono text-[11px] opacity-90">
															{c.status} → {nextStatus}
														</span>
													</div>
												</div>
											) : null}
										</div>
										<div className="space-y-2">
											<label className="block text-sm font-medium text-ops-fg" htmlFor="aml-case-status-comment">
												{t("aml.cases.statusComment")}
											</label>
											<textarea
												id="aml-case-status-comment"
												className={STATUS_TEXTAREA_CLASS}
												placeholder={t("aml.cases.statusComment")}
												value={statusComment}
												onChange={(e) => setStatusComment(e.target.value)}
												rows={3}
											/>
										</div>
										{showOutcomeCodeField ? (
											<div className="space-y-3 rounded-ops-lg border border-ops-border bg-ops-surface-muted/50 p-4 shadow-sm ring-1 ring-ops-border/40">
												<label className="flex items-center gap-2 text-sm font-medium text-ops-fg" htmlFor="aml-case-outcome">
													<Tag className="h-4 w-4 shrink-0 text-ops-fg-muted" aria-hidden />
													{t("aml.cases.outcomeCode")}
												</label>
												<Input
													id="aml-case-outcome"
													className="h-10 max-w-md border-ops-border bg-ops-surface"
													placeholder={t("aml.cases.outcomeCode")}
													value={outcomeCode}
													onChange={(e) => setOutcomeCode(e.target.value)}
												/>
												<p className="text-xs leading-relaxed text-ops-fg-muted">{t("aml.cases.outcomeCodeHint")}</p>
											</div>
										) : null}
										<div className="flex flex-wrap gap-2 border-t border-ops-border pt-6">
											<Button type="submit" className="h-10 min-w-[10rem]" disabled={busy || !statusDirty}>
												{t("aml.cases.saveStatus")}
											</Button>
											<Button
												type="button"
												variant="outline"
												className="h-10"
												disabled={busy}
												onClick={() => {
													setStatusEditorOpen(false);
													setNextStatus(c.status);
													setStatusComment("");
													setOutcomeCode("");
												}}
											>
												{t("common.cancel")}
											</Button>
										</div>
									</form>
								</div>
							) : null}

							{isClosed ? <OpsInlineAlert variant="info">{t("aml.cases.caseClosedStatus")}</OpsInlineAlert> : null}

							<div>
								<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ops-fg-muted">
									<ListChecks className="h-4 w-4 shrink-0" aria-hidden />
									{t("aml.cases.statusHistoryTitle")}
								</h3>
								{statusHistory.length === 0 ? (
									<p className="rounded-ops-lg border border-dashed border-ops-border bg-ops-surface-muted/40 py-8 text-center text-sm text-ops-fg-muted">
										{t("aml.cases.historyEmpty")}
									</p>
								) : (
									<div className={OPS_TABLE_WRAP}>
										<table className={OPS_TABLE}>
											<thead className={OPS_THEAD}>
												<tr>
													<th className={OPS_TH}>{t("aml.cases.historyColDate")}</th>
													<th className={OPS_TH}>{t("aml.cases.historyColFrom")}</th>
													<th className={OPS_TH}>{t("aml.cases.historyColTo")}</th>
													<th className={OPS_TH}>{t("aml.cases.historyColUser")}</th>
													<th className={OPS_TH}>{t("aml.cases.historyColComment")}</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-ops-border bg-ops-surface">
												{statusHistory.map((h) => (
													<tr key={h.id} className={OPS_TR_HOVER}>
														<td className={`${OPS_TD} whitespace-nowrap`}>{formatDateTime(h.changedAt, lang)}</td>
														<td className={OPS_TD}>{h.fromStatus ?? "—"}</td>
														<td className={OPS_TD}>{h.toStatus}</td>
														<td className={OPS_TD}>{h.changedByUsername?.trim() || "—"}</td>
														<td className={`${OPS_TD} max-w-xs whitespace-normal text-xs`}>
															{h.comment?.trim() ? h.comment : "—"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>
					)}

					{activeTab === "declaration" && (
						<div className="space-y-6">
							<div className="flex flex-wrap items-start gap-4">
								<div className="min-w-0 flex-1 space-y-2">
									<div className="flex items-center gap-2 text-sm font-semibold text-ops-fg">
										<FileWarning className="h-4 w-4 shrink-0 text-ops-fg-muted" aria-hidden />
										{t("aml.cases.declarationSection")}
									</div>
									<p className="text-sm text-ops-fg-muted">{t("aml.cases.declarationHint")}</p>
								</div>
								<Button type="button" variant="secondary" onClick={declaration} disabled={busy} className="shrink-0">
									{t("aml.cases.createDeclaration")}
								</Button>
							</div>

							<div>
								<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ops-fg-muted">
									{t("aml.cases.declarationsTitle")}
								</h3>
								{declarations.length === 0 ? (
									<p className="rounded-ops-lg border border-dashed border-ops-border bg-ops-surface-muted/40 py-8 text-center text-sm text-ops-fg-muted">
										{t("aml.cases.declarationsEmpty")}
									</p>
								) : (
									<div className={OPS_TABLE_WRAP}>
										<table className={OPS_TABLE}>
											<thead className={OPS_THEAD}>
												<tr>
													<th className={OPS_TH}>{t("aml.cases.declColId")}</th>
													<th className={OPS_TH}>{t("aml.cases.declColStatus")}</th>
													<th className={OPS_TH}>{t("aml.cases.declColCreatedBy")}</th>
													<th className={OPS_TH}>{t("aml.cases.declColSubmitted")}</th>
													<th className={OPS_TH}>{t("aml.cases.declColExternalRef")}</th>
													<th className={OPS_TH}>{t("aml.cases.declColNotes")}</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-ops-border bg-ops-surface">
												{declarations.map((d) => (
													<tr key={d.id} className={OPS_TR_HOVER}>
														<td className={`${OPS_TD} font-mono`}>{d.id}</td>
														<td className={OPS_TD}>
															<Badge variant="neutral">{d.status}</Badge>
														</td>
														<td className={OPS_TD}>{d.createdByUsername?.trim() || "—"}</td>
														<td className={OPS_TD}>{formatDateTime(d.submittedAt, lang)}</td>
														<td className={`${OPS_TD} font-mono text-xs`}>{d.externalReference ?? "—"}</td>
														<td className={`${OPS_TD} max-w-xs truncate text-xs`} title={d.notes ?? undefined}>
															{d.notes?.trim() ? d.notes : "—"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
