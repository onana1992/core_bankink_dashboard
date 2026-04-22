"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import type { AmlAlertResponse, AmlAlertStatus, AmlClosureReason, AmlAlertSeverity } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

const STATUSES: AmlAlertStatus[] = ["NEW", "ASSIGNED", "UNDER_REVIEW", "ESCALATED", "CLOSED"];
const CLOSURES: AmlClosureReason[] = ["FALSE_POSITIVE", "EXPLAINED", "ESCALATED_DECLARATION", "OTHER"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

function severityVariant(s: AmlAlertSeverity): "neutral" | "info" | "warning" | "danger" {
	if (s === "CRITICAL" || s === "HIGH") return "danger";
	if (s === "MEDIUM") return "warning";
	if (s === "LOW" || s === "INFO") return "info";
	return "neutral";
}

export default function AmlAlertDetailPage() {
	const { t } = useTranslation();
	const params = useParams();
	const id = params?.id as string;
	const [alert, setAlert] = useState<AmlAlertResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [assigneeId, setAssigneeId] = useState("");
	const [nextStatus, setNextStatus] = useState<AmlAlertStatus | "">("");
	const [closureReason, setClosureReason] = useState<AmlClosureReason>("FALSE_POSITIVE");
	const [closureComment, setClosureComment] = useState("");
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const a = await amlApi.getAlert(id);
			setAlert(a);
			setNextStatus(a.status);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
			setAlert(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	async function assign() {
		const uid = Number(assigneeId);
		if (!Number.isFinite(uid) || uid <= 0) return;
		setBusy(true);
		try {
			const a = await amlApi.assignAlert(id, { assigneeUserId: uid });
			setAlert(a);
			setAssigneeId("");
		} finally {
			setBusy(false);
		}
	}

	async function patchStatus() {
		if (!nextStatus || !alert || nextStatus === alert.status) return;
		setBusy(true);
		try {
			const a = await amlApi.patchAlertStatus(id, { status: nextStatus });
			setAlert(a);
		} finally {
			setBusy(false);
		}
	}

	async function close() {
		if (closureReason === "OTHER" && !closureComment.trim()) {
			setError(t("aml.alertDetail.closureOtherComment"));
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const a = await amlApi.closeAlert(id, {
				closureReasonCode: closureReason,
				closureComment: closureComment.trim() || undefined
			});
			setAlert(a);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
		} finally {
			setBusy(false);
		}
	}

	let factsPretty = "";
	if (alert?.factsJson) {
		try {
			factsPretty = JSON.stringify(JSON.parse(alert.factsJson), null, 2);
		} catch {
			factsPretty = alert.factsJson;
		}
	}

	if (loading && !alert) {
		return (
			<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
			</div>
		);
	}

	if (!alert) {
		return (
			<div className="space-y-6 max-w-2xl">
				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
						<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				)}
				<Link href="/aml/alerts" className="text-blue-600 hover:text-blue-800 hover:underline text-sm inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("aml.alerts.backToList")}
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<Link href="/aml/alerts" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("aml.alerts.backToList")}
					</Link>
					<h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">{alert.publicRef}</h1>
					<p className="text-gray-800 mt-2 text-lg">{alert.title}</p>
					<div className="flex flex-wrap gap-2 mt-3">
						<Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
						<Badge>{alert.status}</Badge>
						<Badge variant="neutral">{alert.triggerType}</Badge>
					</div>
				</div>
				<div className="flex flex-wrap gap-3 shrink-0">
					<Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void load()} disabled={loading || busy}>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Link href={`/aml/cases/new?clientId=${alert.clientId}&alertIds=${alert.id}`}>
						<Button type="button" variant="outline">{t("aml.alertDetail.openCase")}</Button>
					</Link>
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

			<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-sm">
				<div>
					<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("aml.detail.client")}</dt>
					<dd className="mt-1">
						<Link href={`/customers/${alert.clientId}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
							{alert.clientId}
						</Link>
					</dd>
				</div>
				{alert.accountId != null && (
					<div>
						<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("aml.detail.account")}</dt>
						<dd className="mt-1">
							<Link href={`/accounts/${alert.accountId}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
								{alert.accountId}
							</Link>
						</dd>
					</div>
				)}
				{alert.transactionId != null && (
					<div>
						<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("aml.detail.transaction")}</dt>
						<dd className="mt-1">
							<Link href={`/transactions/${alert.transactionId}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
								{alert.transactionId}
							</Link>
						</dd>
					</div>
				)}
				<div>
					<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("aml.detail.assigned")}</dt>
					<dd className="mt-1 text-gray-900">{alert.assignedToUserId ?? "—"}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("aml.detail.ruleVersion")}</dt>
					<dd className="mt-1 text-gray-900">
						{alert.ruleDefinitionId ?? "—"} / {alert.ruleVersionId ?? "—"}
					</dd>
				</div>
				<div className="sm:col-span-2">
					<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t("aml.detail.idempotency")}</dt>
					<dd className="mt-1 font-mono text-xs text-gray-800 break-all">{alert.idempotencyKey ?? "—"}</dd>
				</div>
			</dl>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
				<h2 className="text-lg font-semibold text-gray-900 mb-3">{t("aml.detail.facts")}</h2>
				<pre className="text-xs bg-gray-50 p-4 rounded-lg border border-gray-100 overflow-x-auto max-h-96">{factsPretty || "{}"}</pre>
			</div>

			{alert.status !== "CLOSED" && (
				<div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">{t("aml.alertDetail.actions")}</h2>

					<div className="flex flex-wrap items-end gap-3">
						<div className="flex-1 min-w-[160px]">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.alertDetail.assignToUserId")}</label>
							<Input className="h-10" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="User ID" />
						</div>
						<Button type="button" className="h-10" onClick={assign} disabled={busy}>
							{t("aml.alertDetail.assign")}
						</Button>
					</div>

					<div className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-100">
						<div className="min-w-[180px]">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.status")}</label>
							<select className={SELECT_CLASS} value={nextStatus || alert.status} onChange={(e) => setNextStatus(e.target.value as AmlAlertStatus)}>
								{STATUSES.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
						<Button type="button" variant="outline" className="h-10" onClick={patchStatus} disabled={busy || !nextStatus}>
							{t("aml.alertDetail.updateStatus")}
						</Button>
					</div>

					<div className="space-y-3 pt-2 border-t border-gray-100">
						<label className="block text-sm font-medium text-gray-700">{t("aml.alertDetail.closure")}</label>
						<div className="flex flex-wrap gap-3 items-end">
							<select
								className={SELECT_CLASS + " min-w-[200px]"}
								value={closureReason}
								onChange={(e) => setClosureReason(e.target.value as AmlClosureReason)}
							>
								{CLOSURES.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
							<Input
								className="flex-1 min-w-[200px] h-10"
								placeholder={t("aml.alertDetail.closureComment")}
								value={closureComment}
								onChange={(e) => setClosureComment(e.target.value)}
							/>
							<Button type="button" variant="secondary" className="h-10" onClick={close} disabled={busy}>
								{t("aml.alertDetail.closeAlert")}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
