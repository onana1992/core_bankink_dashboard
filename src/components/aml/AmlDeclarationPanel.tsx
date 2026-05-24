"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, FileText, FileWarning, Plus } from "lucide-react";
import { amlApi } from "@/lib/api";
import { translateApiError } from "@/lib/translateApiError";
import type { AmlDeclarationRecordResponse, AmlDeclarationStatus } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
	OpsInlineAlert,
	OPS_CARD_SHELL,
	OPS_TABLE,
	OPS_TABLE_WRAP,
	OPS_THEAD,
	OPS_TH,
	OPS_TD,
	OPS_TR_HOVER
} from "@/components/ops";
import AmlDeclarationDetailModal from "@/components/aml/AmlDeclarationDetailModal";

type Props = {
	caseId: string;
	declarations: AmlDeclarationRecordResponse[];
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

function statusBadgeVariant(status: AmlDeclarationStatus): "neutral" | "success" | "warning" | "danger" | "info" {
	switch (status) {
		case "DRAFT":
			return "warning";
		case "SUBMITTED":
			return "info";
		case "ACKNOWLEDGED":
			return "success";
		case "CLOSED":
			return "neutral";
		default:
			return "neutral";
	}
}

export default function AmlDeclarationPanel({ caseId, declarations, onRefresh, busy, setBusy }: Props) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;

	const [modalOpen, setModalOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const selected = useMemo(
		() => (selectedId != null ? declarations.find((d) => d.id === selectedId) ?? null : null),
		[declarations, selectedId]
	);

	const sortedDeclarations = useMemo(
		() => [...declarations].sort((a, b) => b.id - a.id),
		[declarations]
	);

	function statusLabel(status: AmlDeclarationStatus): string {
		return t(`aml.cases.declStatus_${status}`, { defaultValue: status });
	}

	function openDeclaration(id: number) {
		setSelectedId(id);
		setModalOpen(true);
	}

	function handleModalOpenChange(open: boolean) {
		setModalOpen(open);
		if (!open) {
			setSelectedId(null);
		}
	}

	async function createDraft() {
		setBusy(true);
		setError(null);
		setSuccess(null);
		try {
			const created = await amlApi.createDeclaration(caseId, {});
			setSuccess(t("aml.cases.declarationCreated"));
			await onRefresh();
			if (created?.id) {
				openDeclaration(created.id);
			}
		} catch (e: unknown) {
			const raw = e instanceof Error ? e.message : "Error";
			setError(translateApiError(raw, t));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex gap-3 min-w-0">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ops-lg bg-violet-100 text-violet-700">
						<FileWarning className="h-5 w-5" aria-hidden />
					</div>
					<div className="min-w-0">
						<h3 className="text-base font-semibold text-ops-fg">{t("aml.cases.declarationSection")}</h3>
						<p className="mt-1 text-sm text-ops-fg-muted leading-relaxed">{t("aml.cases.declarationHint")}</p>
					</div>
				</div>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					className="shrink-0 gap-1.5"
					onClick={() => void createDraft()}
					disabled={busy}
				>
					<Plus className="h-4 w-4" aria-hidden />
					{t("aml.cases.createDeclaration")}
				</Button>
			</div>

			{error ? <OpsInlineAlert variant="error">{error}</OpsInlineAlert> : null}
			{success ? <OpsInlineAlert variant="success">{success}</OpsInlineAlert> : null}

			{declarations.length === 0 ? (
				<div className={`${OPS_CARD_SHELL} p-10 sm:p-14 text-center`}>
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ops-surface-muted">
						<FileText className="h-7 w-7 text-ops-fg-muted" aria-hidden />
					</div>
					<p className="mt-4 text-sm font-semibold text-ops-fg">{t("aml.cases.declEmptyTitle")}</p>
					<p className="mt-2 text-sm text-ops-fg-muted max-w-md mx-auto">{t("aml.cases.declEmptyDesc")}</p>
					<Button type="button" className="mt-6 gap-1.5" onClick={() => void createDraft()} disabled={busy}>
						<Plus className="h-4 w-4" aria-hidden />
						{t("aml.cases.createDeclaration")}
					</Button>
				</div>
			) : (
				<div className={OPS_CARD_SHELL}>
					<div className="px-6 py-4 border-b border-ops-border bg-ops-surface-muted">
						<p className="text-sm font-semibold text-ops-fg">{t("aml.cases.declarationsTitle")}</p>
						<p className="mt-0.5 text-sm text-ops-fg-muted">
							{t("aml.cases.declListCount", { count: declarations.length })}
						</p>
					</div>
					<div className={OPS_TABLE_WRAP}>
						<table className={OPS_TABLE}>
							<thead className={OPS_THEAD}>
								<tr>
									<th className={OPS_TH}>{t("aml.cases.declColRef")}</th>
									<th className={OPS_TH}>{t("aml.cases.declColStatus")}</th>
									<th className={OPS_TH}>{t("aml.cases.declColCreatedBy")}</th>
									<th className={OPS_TH}>{t("aml.cases.declColSubmitted")}</th>
									<th className={OPS_TH}>{t("aml.cases.declColExternalRef")}</th>
									<th className={`${OPS_TH} text-right`}>{t("aml.cases.declColActions")}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-ops-border bg-ops-surface">
								{sortedDeclarations.map((d) => (
									<tr key={d.id} className={OPS_TR_HOVER}>
										<td className={`${OPS_TD} font-mono text-xs font-semibold`}>
											{d.publicRef ?? `#${d.id}`}
										</td>
										<td className={OPS_TD}>
											<Badge variant={statusBadgeVariant(d.status)}>{statusLabel(d.status)}</Badge>
										</td>
										<td className={OPS_TD}>
											<span className="block text-ops-fg">{d.createdByUsername ?? "—"}</span>
											<span className="block text-xs text-ops-fg-muted mt-0.5">
												{formatDt(d.createdAt, lang)}
											</span>
										</td>
										<td className={OPS_TD}>{formatDt(d.submittedAt ?? d.validatedAt, lang)}</td>
										<td className={`${OPS_TD} font-mono text-xs max-w-[10rem] truncate`}>
											{d.externalReference ?? "—"}
										</td>
										<td className={`${OPS_TD} text-right`}>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="gap-1.5"
												onClick={() => openDeclaration(d.id)}
											>
												<ExternalLink className="h-3.5 w-3.5" aria-hidden />
												{t("aml.cases.declOpen")}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<AmlDeclarationDetailModal
				open={modalOpen}
				onOpenChange={handleModalOpenChange}
				declaration={selected}
				onRefresh={onRefresh}
				busy={busy}
				setBusy={setBusy}
			/>
		</div>
	);
}
