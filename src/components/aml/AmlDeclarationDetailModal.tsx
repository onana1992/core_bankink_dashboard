"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CheckCircle2,
	ChevronRight,
	Download,
	History,
	Radio,
	Save,
	Send,
	ShieldCheck
} from "lucide-react";
import { amlApi } from "@/lib/api";
import { translateApiError } from "@/lib/translateApiError";
import type {
	AmlDeclarationRecordResponse,
	AmlDeclarationStatus,
	AmlDeclarationStatusHistoryResponse,
	AmlTransmissionChannel
} from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import {
	OpsField,
	OpsInlineAlert,
	OpsModal,
	OPS_CARD_HEADER,
	OPS_CARD_SHELL,
	OPS_SELECT
} from "@/components/ops";
import AmlDeclarationFactsSnapshotView from "@/components/aml/AmlDeclarationFactsSnapshot";

const CHANNELS: AmlTransmissionChannel[] = ["PORTAL", "EMAIL_SECURE", "PHYSICAL", "OTHER"];
const WORKFLOW: AmlDeclarationStatus[] = ["DRAFT", "SUBMITTED", "ACKNOWLEDGED", "CLOSED"];
const MIN_SUMMARY_LENGTH = 50;

const STATUS_TEXTAREA_CLASS =
	"w-full min-h-[140px] rounded-ops-md border border-ops-border bg-ops-surface px-3 py-2.5 text-sm text-ops-fg outline-none transition focus:border-ops-ring focus:ring-2 focus:ring-ops-ring/25 disabled:cursor-not-allowed disabled:opacity-60";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	declaration: AmlDeclarationRecordResponse | null;
	onRefresh: () => Promise<void>;
	busy: boolean;
	setBusy: (v: boolean) => void;
};

function formatDt(iso: string | null | undefined, lang: string): string {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleString(lang.startsWith("fr") ? "fr-FR" : "en-US", {
			dateStyle: "medium",
			timeStyle: "short"
		});
	} catch {
		return "—";
	}
}

function statusStepIndex(status: AmlDeclarationStatus): number {
	return WORKFLOW.indexOf(status);
}

export default function AmlDeclarationDetailModal({
	open,
	onOpenChange,
	declaration,
	onRefresh,
	busy,
	setBusy
}: Props) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;

	const [summary, setSummary] = useState("");
	const [history, setHistory] = useState<AmlDeclarationStatusHistoryResponse[]>([]);
	const [extRef, setExtRef] = useState("");
	const [channel, setChannel] = useState<AmlTransmissionChannel>("PORTAL");
	const [txDate, setTxDate] = useState("");
	const [closureReason, setClosureReason] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const summaryTrimmed = summary.trim();
	const summarySaved = (declaration?.suspicionSummary ?? "").trim();
	const summaryDirty = declaration?.status === "DRAFT" && summaryTrimmed !== summarySaved;
	const summaryValid = summaryTrimmed.length >= MIN_SUMMARY_LENGTH;
	const readOnlySummary = declaration != null && declaration.status !== "DRAFT";
	const currentStep = declaration ? statusStepIndex(declaration.status) : -1;

	useEffect(() => {
		if (!open || !declaration) return;
		setSummary(declaration.suspicionSummary ?? "");
		setExtRef(declaration.externalReference ?? "");
		setChannel(declaration.transmissionChannel ?? "PORTAL");
		setClosureReason("");
		setError(null);
		setSuccess(null);
	}, [open, declaration?.id]);

	const loadHistory = useCallback(async (id: number) => {
		try {
			const h = await amlApi.getDeclarationHistory(id);
			setHistory(h);
		} catch {
			setHistory([]);
		}
	}, []);

	const refreshWithHistory = useCallback(
		async (declarationId: number) => {
			await onRefresh();
			await loadHistory(declarationId);
		},
		[onRefresh, loadHistory]
	);

	useEffect(() => {
		if (open && declaration?.id) {
			void loadHistory(declaration.id);
		} else if (!open) {
			setHistory([]);
		}
	}, [open, declaration?.id, declaration?.status, loadHistory]);

	function statusLabel(status: AmlDeclarationStatus | null): string {
		if (!status) return "—";
		return t(`aml.cases.declStatus_${status}`, { defaultValue: status });
	}

	function reportError(e: unknown) {
		const raw = e instanceof Error ? e.message : "Error";
		setError(translateApiError(raw, t));
		setSuccess(null);
	}

	function reportSuccess(message: string) {
		setSuccess(message);
		setError(null);
	}

	async function saveDraft(): Promise<boolean> {
		if (!declaration || declaration.status !== "DRAFT") return true;
		setBusy(true);
		setError(null);
		try {
			await amlApi.patchDeclaration(declaration.id, { suspicionSummary: summaryTrimmed });
			reportSuccess(t("aml.cases.declSaveSuccess"));
			await onRefresh();
			return true;
		} catch (e: unknown) {
			reportError(e);
			return false;
		} finally {
			setBusy(false);
		}
	}

	async function submit() {
		if (!declaration) return;
		setBusy(true);
		setError(null);
		try {
			if (summaryDirty || !summaryValid) {
				const ok = await saveDraft();
				if (!ok) return;
				if (summaryTrimmed.length < MIN_SUMMARY_LENGTH) {
					setError(t("aml.cases.declSummaryTooShort", { min: MIN_SUMMARY_LENGTH }));
					return;
				}
			}
			await amlApi.submitDeclaration(declaration.id);
			reportSuccess(t("aml.cases.declSubmitSuccess"));
			await refreshWithHistory(declaration.id);
		} catch (e: unknown) {
			reportError(e);
		} finally {
			setBusy(false);
		}
	}

	async function acknowledge() {
		if (!declaration) return;
		setBusy(true);
		setError(null);
		try {
			const submittedAt = txDate ? new Date(txDate).toISOString() : new Date().toISOString();
			await amlApi.acknowledgeDeclaration(declaration.id, {
				submittedAt,
				externalReference: extRef.trim(),
				transmissionChannel: channel
			});
			reportSuccess(t("aml.cases.declAckSuccess"));
			await refreshWithHistory(declaration.id);
		} catch (e: unknown) {
			reportError(e);
		} finally {
			setBusy(false);
		}
	}

	async function closeDecl() {
		if (!declaration) return;
		setBusy(true);
		setError(null);
		try {
			await amlApi.closeDeclaration(declaration.id, { closureReason: closureReason.trim() });
			reportSuccess(t("aml.cases.declCloseSuccess"));
			await refreshWithHistory(declaration.id);
		} catch (e: unknown) {
			reportError(e);
		} finally {
			setBusy(false);
		}
	}

	async function exportDos(format: "pdf" | "json") {
		if (!declaration) return;
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(amlApi.exportDeclarationUrl(declaration.id, format), {
				headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}` }
			});
			if (!res.ok) throw new Error(await res.text());
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${declaration.publicRef ?? "dos-" + declaration.id}.${format}`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (e: unknown) {
			reportError(e);
		} finally {
			setBusy(false);
		}
	}

	const summaryCounterClass = useMemo(() => {
		if (readOnlySummary) return "text-ops-fg-muted";
		if (summaryValid) return "text-emerald-600";
		return "text-amber-600";
	}, [readOnlySummary, summaryValid]);

	if (!declaration) return null;

	const title = declaration.publicRef ?? `#${declaration.id}`;

	return (
		<OpsModal
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			description={t("aml.cases.declEditTitle")}
			size="xl"
			className="max-w-5xl"
		>
			<div className="space-y-4">
				{error ? <OpsInlineAlert variant="error">{error}</OpsInlineAlert> : null}
				{success ? <OpsInlineAlert variant="success">{success}</OpsInlineAlert> : null}

				<div className={`${OPS_CARD_SHELL} px-4 py-3`}>
					<p className="text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-2">
						{t("aml.cases.declWorkflow")}
					</p>
					<ol className="flex flex-wrap items-center gap-1">
						{WORKFLOW.map((step, idx) => {
							const done = currentStep > idx;
							const current = currentStep === idx;
							return (
								<li key={step} className="flex items-center">
									<span
										className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
											current
												? "bg-violet-600 text-white"
												: done
													? "bg-emerald-100 text-emerald-800"
													: "bg-ops-surface-muted text-ops-fg-muted"
										}`}
									>
										{done && !current ? (
											<CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
										) : null}
										{statusLabel(step)}
									</span>
									{idx < WORKFLOW.length - 1 ? (
										<ChevronRight className="mx-0.5 h-4 w-4 text-ops-fg-muted" aria-hidden />
									) : null}
								</li>
							);
						})}
					</ol>
				</div>

				<div className={OPS_CARD_SHELL}>
					<div className={`${OPS_CARD_HEADER} flex items-center gap-2 py-3`}>
						<ShieldCheck className="h-4 w-4 text-ops-fg-muted shrink-0" aria-hidden />
						<span className="text-sm font-semibold text-ops-fg">{t("aml.cases.declSectionDraft")}</span>
					</div>
					<div className="p-4 space-y-3">
						<OpsField
							label={
								<span className="flex flex-wrap items-center justify-between gap-2 w-full">
									<span>{t("aml.cases.declSummary")}</span>
									{!readOnlySummary ? (
										<span className={`text-xs font-normal tabular-nums ${summaryCounterClass}`}>
											{summaryTrimmed.length} / {MIN_SUMMARY_LENGTH}
										</span>
									) : null}
								</span>
							}
							htmlFor="aml-decl-modal-summary"
						>
							<textarea
								id="aml-decl-modal-summary"
								className={STATUS_TEXTAREA_CLASS}
								value={summary}
								onChange={(e) => setSummary(e.target.value)}
								readOnly={readOnlySummary}
								disabled={busy}
								placeholder={t("aml.cases.declSummaryPlaceholder")}
							/>
						</OpsField>
						{!readOnlySummary ? (
							<p className="text-xs text-ops-fg-muted">{t("aml.cases.declSummaryHint")}</p>
						) : null}
						{summaryDirty ? (
							<OpsInlineAlert variant="warning">{t("aml.cases.declUnsavedHint")}</OpsInlineAlert>
						) : null}
						{declaration.status === "DRAFT" && (
							<div className="flex flex-wrap gap-2 pt-1">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									className="gap-1.5"
									onClick={() => void saveDraft()}
									disabled={busy}
								>
									<Save className="h-4 w-4" aria-hidden />
									{t("aml.cases.declSave")}
								</Button>
								<Button
									type="button"
									size="sm"
									className="gap-1.5"
									onClick={() => void submit()}
									disabled={busy || !summaryValid}
									title={!summaryValid ? t("aml.cases.declSummaryTooShort", { min: MIN_SUMMARY_LENGTH }) : undefined}
								>
									<Send className="h-4 w-4" aria-hidden />
									{t("aml.cases.declSubmit")}
								</Button>
							</div>
						)}
					</div>
				</div>

				<AmlDeclarationFactsSnapshotView factsSnapshotJson={declaration.factsSnapshotJson} />

				{(declaration.status === "SUBMITTED" || declaration.status === "ACKNOWLEDGED") && (
					<div className={OPS_CARD_SHELL}>
						<div className={`${OPS_CARD_HEADER} flex items-center gap-2 py-3`}>
							<Radio className="h-4 w-4 text-ops-fg-muted shrink-0" aria-hidden />
							<span className="text-sm font-semibold text-ops-fg">{t("aml.cases.declSectionTransmission")}</span>
						</div>
						<div className="p-4">
							{declaration.status === "SUBMITTED" ? (
								<div className="grid gap-4 sm:grid-cols-2">
									<OpsField label={t("aml.cases.declExtRef")} htmlFor="aml-decl-modal-ext-ref">
										<Input
											id="aml-decl-modal-ext-ref"
											placeholder={t("aml.cases.declExtRefPlaceholder")}
											value={extRef}
											onChange={(e) => setExtRef(e.target.value)}
											disabled={busy}
										/>
									</OpsField>
									<OpsField label={t("aml.cases.declChannel")} htmlFor="aml-decl-modal-channel">
										<select
											id="aml-decl-modal-channel"
											className={OPS_SELECT}
											value={channel}
											onChange={(e) => setChannel(e.target.value as AmlTransmissionChannel)}
											disabled={busy}
										>
											{CHANNELS.map((c) => (
												<option key={c} value={c}>
													{t(`aml.cases.declChannel_${c}`)}
												</option>
											))}
										</select>
									</OpsField>
									<OpsField label={t("aml.cases.declTxDate")} htmlFor="aml-decl-modal-tx-date" className="sm:col-span-2">
										<Input
											id="aml-decl-modal-tx-date"
											type="datetime-local"
											value={txDate}
											onChange={(e) => setTxDate(e.target.value)}
											disabled={busy}
										/>
									</OpsField>
									<div className="sm:col-span-2">
										<Button
											type="button"
											size="sm"
											className="gap-1.5"
											onClick={() => void acknowledge()}
											disabled={busy || !extRef.trim()}
										>
											<CheckCircle2 className="h-4 w-4" aria-hidden />
											{t("aml.cases.declAcknowledge")}
										</Button>
									</div>
								</div>
							) : (
								<dl className="grid gap-3 sm:grid-cols-2 text-sm">
									<div>
										<dt className="text-xs font-medium text-ops-fg-muted">{t("aml.cases.declExtRef")}</dt>
										<dd className="mt-0.5 font-mono text-ops-fg">{declaration.externalReference ?? "—"}</dd>
									</div>
									<div>
										<dt className="text-xs font-medium text-ops-fg-muted">{t("aml.cases.declChannel")}</dt>
										<dd className="mt-0.5 text-ops-fg">
											{declaration.transmissionChannel
												? t(`aml.cases.declChannel_${declaration.transmissionChannel}`)
												: "—"}
										</dd>
									</div>
									<div>
										<dt className="text-xs font-medium text-ops-fg-muted">{t("aml.cases.declColSubmitted")}</dt>
										<dd className="mt-0.5 text-ops-fg">{formatDt(declaration.submittedAt, lang)}</dd>
									</div>
								</dl>
							)}
						</div>
					</div>
				)}

				{(declaration.status === "ACKNOWLEDGED" || declaration.status === "SUBMITTED") && (
					<div className={OPS_CARD_SHELL}>
						<div className={`${OPS_CARD_HEADER} flex items-center gap-2 py-3`}>
							<CheckCircle2 className="h-4 w-4 text-ops-fg-muted shrink-0" aria-hidden />
							<span className="text-sm font-semibold text-ops-fg">{t("aml.cases.declSectionClosure")}</span>
						</div>
						<div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
							<OpsField label={t("aml.cases.declClosureReason")} htmlFor="aml-decl-modal-close" className="flex-1">
								<Input
									id="aml-decl-modal-close"
									placeholder={t("aml.cases.declClosureReasonPlaceholder")}
									value={closureReason}
									onChange={(e) => setClosureReason(e.target.value)}
									disabled={busy}
								/>
							</OpsField>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="shrink-0"
								onClick={() => void closeDecl()}
								disabled={busy || !closureReason.trim()}
							>
								{t("aml.cases.declClose")}
							</Button>
						</div>
					</div>
				)}

				<div className="grid gap-4 sm:grid-cols-2">
					<div className={`${OPS_CARD_SHELL} p-4`}>
						<p className="text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-3">
							{t("aml.cases.declSectionActions")}
						</p>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => void exportDos("pdf")}
								disabled={busy}
							>
								<Download className="h-4 w-4" aria-hidden />
								{t("aml.cases.declExportPdf")}
							</Button>
							<Button type="button" variant="ghost" size="sm" onClick={() => void exportDos("json")} disabled={busy}>
								JSON
							</Button>
						</div>
					</div>

					<div className={`${OPS_CARD_SHELL} p-4`}>
						<p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-3">
							<History className="h-3.5 w-3.5" aria-hidden />
							{t("aml.cases.declHistory")}
						</p>
						{history.length === 0 ? (
							<p className="text-sm text-ops-fg-muted">{t("aml.cases.declHistoryEmpty")}</p>
						) : (
							<ul className="space-y-2 max-h-40 overflow-y-auto">
								{history.map((h) => (
									<li key={h.id} className="border-l-2 border-ops-border pl-2 text-sm">
										<span className="font-medium text-ops-fg">
											{statusLabel(h.fromStatus)} → {statusLabel(h.toStatus)}
										</span>
										<p className="text-xs text-ops-fg-muted mt-0.5">
											{formatDt(h.changedAt, lang)}
											{h.changedByUsername ? ` · ${h.changedByUsername}` : ""}
										</p>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</OpsModal>
	);
}
