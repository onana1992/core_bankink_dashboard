"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import type { AmlDeclarationFactsSnapshot } from "@/types";
import { OPS_CARD_HEADER, OPS_CARD_SHELL } from "@/components/ops";

type Props = {
	factsSnapshotJson: string | null | undefined;
};

function formatDt(iso: string | undefined, lang: string): string {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleString(lang.startsWith("fr") ? "fr-FR" : "en-US", {
			dateStyle: "medium",
			timeStyle: "short"
		});
	} catch {
		return iso;
	}
}

function parseSnapshot(json: string | null | undefined): AmlDeclarationFactsSnapshot | null {
	if (!json?.trim()) return null;
	try {
		return JSON.parse(json) as AmlDeclarationFactsSnapshot;
	} catch {
		return null;
	}
}

export default function AmlDeclarationFactsSnapshotView({ factsSnapshotJson }: Props) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;
	const [showRaw, setShowRaw] = useState(false);

	const snapshot = useMemo(() => parseSnapshot(factsSnapshotJson), [factsSnapshotJson]);
	const parseFailed = Boolean(factsSnapshotJson?.trim()) && snapshot == null;

	if (!factsSnapshotJson?.trim()) {
		return (
			<div className={OPS_CARD_SHELL}>
				<div className={`${OPS_CARD_HEADER} flex items-center gap-2`}>
					<Camera className="h-4 w-4 text-ops-fg-muted shrink-0" aria-hidden />
					<span className="text-sm font-semibold text-ops-fg">{t("aml.cases.declFactsSnapshot")}</span>
				</div>
				<p className="p-4 sm:p-6 text-sm text-ops-fg-muted">{t("aml.cases.declFactsSnapshotPending")}</p>
			</div>
		);
	}

	return (
		<div className={OPS_CARD_SHELL}>
			<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-2`}>
				<span className="flex items-center gap-2 text-sm font-semibold text-ops-fg">
					<Camera className="h-4 w-4 text-ops-fg-muted shrink-0" aria-hidden />
					{t("aml.cases.declFactsSnapshot")}
				</span>
				{snapshot?.capturedAt ? (
					<span className="text-xs text-ops-fg-muted">
						{t("aml.cases.declFactsSnapshotCaptured", { date: formatDt(snapshot.capturedAt, lang) })}
					</span>
				) : null}
			</div>
			<div className="p-4 sm:p-6 space-y-4">
				{parseFailed ? (
					<p className="text-sm text-amber-700">{t("aml.cases.declFactsSnapshotParseError")}</p>
				) : null}

				{snapshot?.client ? (
					<section>
						<h4 className="text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-2">
							{t("aml.cases.declFactsSnapshotClient")}
						</h4>
						<dl className="grid gap-2 sm:grid-cols-2 text-sm">
							<div>
								<dt className="text-xs text-ops-fg-muted">{t("aml.cases.declFactsSnapshotClientName")}</dt>
								<dd className="font-medium text-ops-fg">{snapshot.client.displayName}</dd>
							</div>
							<div>
								<dt className="text-xs text-ops-fg-muted">{t("aml.cases.declFactsSnapshotClientType")}</dt>
								<dd className="text-ops-fg">{snapshot.client.type}</dd>
							</div>
							{snapshot.client.incorporationCountry ? (
								<div>
									<dt className="text-xs text-ops-fg-muted">{t("aml.cases.declFactsSnapshotClientCountry")}</dt>
									<dd className="text-ops-fg">{snapshot.client.incorporationCountry}</dd>
								</div>
							) : null}
						</dl>
					</section>
				) : null}

				{snapshot?.riskProfile ? (
					<section>
						<h4 className="text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-2">
							{t("aml.cases.declFactsSnapshotRisk")}
						</h4>
						<dl className="grid gap-2 sm:grid-cols-3 text-sm">
							<div>
								<dt className="text-xs text-ops-fg-muted">{t("aml.cases.declFactsSnapshotRiskLevel")}</dt>
								<dd className="font-medium text-ops-fg">{snapshot.riskProfile.riskLevel}</dd>
							</div>
							<div>
								<dt className="text-xs text-ops-fg-muted">{t("aml.cases.declFactsSnapshotRiskScore")}</dt>
								<dd className="text-ops-fg">{snapshot.riskProfile.riskScore}</dd>
							</div>
							<div>
								<dt className="text-xs text-ops-fg-muted">{t("aml.cases.declFactsSnapshotDiligence")}</dt>
								<dd className="text-ops-fg">{snapshot.riskProfile.diligenceLevel}</dd>
							</div>
						</dl>
					</section>
				) : null}

				{snapshot?.alerts && snapshot.alerts.length > 0 ? (
					<section>
						<h4 className="text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-2">
							{t("aml.cases.declFactsSnapshotAlerts", { count: snapshot.alerts.length })}
						</h4>
						<ul className="space-y-2">
							{snapshot.alerts.map((a) => (
								<li
									key={a.publicRef}
									className="rounded-ops-md border border-ops-border bg-ops-surface-muted/40 px-3 py-2 text-sm"
								>
									<p className="font-mono text-xs text-ops-fg-muted">{a.publicRef}</p>
									<p className="font-medium text-ops-fg mt-0.5">
										<span className="text-ops-fg-muted">{a.severity}</span>
										{" · "}
										{a.title}
									</p>
									{a.factsJson ? (
										<p className="mt-1 text-xs text-ops-fg-muted line-clamp-3 whitespace-pre-wrap">{a.factsJson}</p>
									) : null}
								</li>
							))}
						</ul>
					</section>
				) : null}

				{snapshot?.notes && snapshot.notes.length > 0 ? (
					<section>
						<h4 className="text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-2">
							{t("aml.cases.declFactsSnapshotNotes", { count: snapshot.notes.length })}
						</h4>
						<ul className="space-y-2">
							{snapshot.notes.map((n, i) => (
								<li
									key={`${n.createdAt}-${i}`}
									className="rounded-ops-md border border-ops-border px-3 py-2 text-sm"
								>
									<p className="text-xs font-medium text-ops-fg-muted">{n.noteType}</p>
									<p className="mt-1 text-ops-fg whitespace-pre-wrap">{n.body}</p>
								</li>
							))}
						</ul>
					</section>
				) : null}

				{snapshot?.screening && snapshot.screening.length > 0 ? (
					<section>
						<h4 className="text-xs font-bold uppercase tracking-wide text-ops-fg-muted mb-2">
							{t("aml.cases.declFactsSnapshotScreening")}
						</h4>
						<ul className="divide-y divide-ops-border rounded-ops-md border border-ops-border text-sm">
							{snapshot.screening.map((s, i) => (
								<li key={`${s.type}-${s.checkedAt}-${i}`} className="flex justify-between gap-3 px-3 py-2">
									<span className="text-ops-fg">{s.type}</span>
									<span className="text-ops-fg-muted">
										{s.result} · {formatDt(s.checkedAt, lang)}
									</span>
								</li>
							))}
						</ul>
					</section>
				) : null}

				<button
					type="button"
					className="flex items-center gap-1 text-xs font-medium text-ops-fg-muted hover:text-ops-fg"
					onClick={() => setShowRaw((v) => !v)}
				>
					{showRaw ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
					{t("aml.cases.declFactsSnapshotRaw")}
				</button>
				{showRaw ? (
					<pre className="max-h-64 overflow-auto rounded-ops-md bg-ops-surface-muted p-3 text-[11px] leading-relaxed text-ops-fg">
						{factsSnapshotJson}
					</pre>
				) : null}
			</div>
		</div>
	);
}
