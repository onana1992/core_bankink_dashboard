"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import type { AmlDeclarationDetailResponse, AmlDeclarationMetricsResponse, AmlDeclarationStatus } from "@/types";
import Badge from "@/components/ui/Badge";
import { OPS_PAGE_STACK, OPS_TABLE, OPS_TABLE_WRAP, OPS_THEAD, OPS_TH, OPS_TD, OPS_TR_HOVER, OpsPageHeader } from "@/components/ops";

const STATUSES: (AmlDeclarationStatus | "")[] = ["", "DRAFT", "SUBMITTED", "ACKNOWLEDGED", "CLOSED"];

export default function AmlDeclarationsWorklistPage() {
	const { t } = useTranslation();
	const [status, setStatus] = useState<AmlDeclarationStatus | "">("");
	const [rows, setRows] = useState<AmlDeclarationDetailResponse[]>([]);
	const [metrics, setMetrics] = useState<AmlDeclarationMetricsResponse | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [list, m] = await Promise.all([
				amlApi.listDeclarationsWorklist(status || undefined),
				amlApi.getDeclarationMetrics()
			]);
			setRows(list);
			setMetrics(m);
		} finally {
			setLoading(false);
		}
	}, [status]);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className={OPS_PAGE_STACK}>
			<OpsPageHeader title={t("aml.declarations.worklistTitle")} subtitle={t("aml.declarations.worklistSubtitle")} />
			{metrics && (
				<div className="grid gap-3 sm:grid-cols-4 text-sm">
					<div className="rounded-ops-lg border border-ops-border p-3">
						<div className="text-ops-fg-muted">{t("aml.declarations.metricSubmitted")}</div>
						<div className="text-lg font-semibold">{metrics.submittedThisMonth}</div>
					</div>
					<div className="rounded-ops-lg border border-ops-border p-3">
						<div className="text-ops-fg-muted">{t("aml.declarations.metricAck")}</div>
						<div className="text-lg font-semibold">{metrics.acknowledgedThisMonth}</div>
					</div>
					<div className="rounded-ops-lg border border-ops-border p-3">
						<div className="text-ops-fg-muted">{t("aml.declarations.metricDraft")}</div>
						<div className="text-lg font-semibold">{metrics.draftCount}</div>
					</div>
					<div className="rounded-ops-lg border border-ops-border p-3">
						<div className="text-ops-fg-muted">{t("aml.declarations.metricPending")}</div>
						<div className="text-lg font-semibold">{metrics.submittedPendingTransmission}</div>
					</div>
				</div>
			)}
			<select
				className="h-10 max-w-xs rounded-ops-md border border-ops-border px-2 text-sm"
				value={status}
				onChange={(e) => setStatus(e.target.value as AmlDeclarationStatus | "")}
			>
				{STATUSES.map((s) => (
					<option key={s || "all"} value={s}>
						{s || t("aml.declarations.filterAll")}
					</option>
				))}
			</select>
			{loading ? (
				<p className="text-sm text-ops-fg-muted">{t("common.loading")}</p>
			) : (
				<div className={OPS_TABLE_WRAP}>
					<table className={OPS_TABLE}>
						<thead className={OPS_THEAD}>
							<tr>
								<th className={OPS_TH}>{t("aml.cases.declColRef")}</th>
								<th className={OPS_TH}>{t("aml.cases.declColStatus")}</th>
								<th className={OPS_TH}>{t("aml.declarations.colCase")}</th>
								<th className={OPS_TH} />
							</tr>
						</thead>
						<tbody className="divide-y divide-ops-border bg-ops-surface">
							{rows.map((r) => (
								<tr key={r.id} className={OPS_TR_HOVER}>
									<td className={`${OPS_TD} font-mono text-xs`}>{r.publicRef ?? r.id}</td>
									<td className={OPS_TD}>
										<Badge variant="neutral">{r.status}</Badge>
									</td>
									<td className={OPS_TD}>
										<Link href={`/aml/cases/${r.caseId}`} className="text-ops-accent hover:underline">
											{r.casePublicRef ?? r.caseId}
										</Link>
									</td>
									<td className={OPS_TD}>
										<Link href={`/aml/cases/${r.caseId}?tab=declaration`} className="text-sm text-ops-accent">
											{t("aml.declarations.openCase")}
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
