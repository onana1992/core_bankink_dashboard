"use client";

import type { ElementType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
	ArrowLeft,
	ArrowLeftRight,
	CalendarClock,
	Code2,
	Fingerprint,
	FolderKanban,
	ListChecks,
	Lock,
	RefreshCw,
	Scale,
	User,
	UserCircle,
	UserPlus,
	Wallet
} from "lucide-react";
import { amlApi, usersApi } from "@/lib/api";
import type { AmlAlertResponse, AmlAlertStatus, AmlClosureReason, AmlAlertSeverity, User } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

const STATUSES: AmlAlertStatus[] = ["NEW", "ASSIGNED", "UNDER_REVIEW", "ESCALATED", "CLOSED"];
const CLOSURES: AmlClosureReason[] = ["FALSE_POSITIVE", "EXPLAINED", "ESCALATED_DECLARATION", "OTHER"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

function severityVariant(s: AmlAlertSeverity): "neutral" | "info" | "warning" | "danger" {
	if (s === "CRITICAL" || s === "HIGH") return "danger";
	if (s === "MEDIUM") return "warning";
	if (s === "LOW" || s === "INFO") return "info";
	return "neutral";
}

function formatUserLabel(u: User): string {
	const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
	if (name) return `${u.username} — ${name}`;
	if (u.email) return `${u.username} (${u.email})`;
	return u.username;
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
		<div
			className={`rounded-xl border border-gray-200/90 bg-gradient-to-b from-gray-50/90 to-white p-4 shadow-sm ${className}`}
		>
			<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
				<Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
				{label}
			</div>
			<div className="mt-2 min-h-[1.25rem] text-sm font-medium text-gray-900">{children}</div>
		</div>
	);
}

export default function AmlAlertDetailPage() {
	const { t, i18n } = useTranslation();
	const params = useParams();
	const id = params?.id as string;
	const [alert, setAlert] = useState<AmlAlertResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [assigneeId, setAssigneeId] = useState("");
	const [assignUsers, setAssignUsers] = useState<User[]>([]);
	const [assignUsersLoading, setAssignUsersLoading] = useState(true);
	const [assignUsersError, setAssignUsersError] = useState<string | null>(null);
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
		void load();
	}, [load]);

	useEffect(() => {
		let cancelled = false;
		setAssignUsersLoading(true);
		setAssignUsersError(null);
		void (async () => {
			try {
				const data = await usersApi.list({ status: "ACTIVE", page: 0, size: 500 });
				if (cancelled) return;
				const list = [...(data.content ?? [])].sort((a, b) =>
					a.username.localeCompare(b.username, undefined, { sensitivity: "base" })
				);
				setAssignUsers(list);
			} catch (e: unknown) {
				if (!cancelled) {
					setAssignUsers([]);
					setAssignUsersError(e instanceof Error ? e.message : String(e));
				}
			} finally {
				if (!cancelled) setAssignUsersLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	async function assign() {
		const uid = Number(assigneeId);
		if (!Number.isFinite(uid) || uid <= 0) return;
		setBusy(true);
		setError(null);
		try {
			const a = await amlApi.assignAlert(id, { assigneeUserId: uid });
			setAlert(a);
			setNextStatus(a.status);
			setAssigneeId("");
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
		} finally {
			setBusy(false);
		}
	}

	async function patchStatus() {
		if (!nextStatus || !alert || nextStatus === alert.status) return;
		setBusy(true);
		setError(null);
		try {
			const a = await amlApi.patchAlertStatus(id, { status: nextStatus });
			setAlert(a);
			setNextStatus(a.status);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
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
			setNextStatus(a.status);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
		} finally {
			setBusy(false);
		}
	}

	const factsPretty = useMemo(() => {
		if (!alert?.factsJson) return "";
		try {
			return JSON.stringify(JSON.parse(alert.factsJson), null, 2);
		} catch {
			return alert.factsJson;
		}
	}, [alert?.factsJson]);

	const backLinkClass =
		"inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900";

	if (loading && !alert) {
		return (
			<div className="w-full min-w-0">
				<div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			</div>
		);
	}

	if (!alert) {
		return (
			<div className="w-full min-w-0 space-y-6">
				{error && (
					<div className="flex items-center gap-2 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3 text-red-800">
						<svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				)}
				<Link href="/aml/alerts" className={backLinkClass}>
					<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
					{t("aml.alerts.backToList")}
				</Link>
			</div>
		);
	}

	const lang = i18n.language || "fr";

	return (
		<div className="w-full min-w-0 space-y-6">
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0 flex-1 space-y-4">
						<Link href="/aml/alerts" className={backLinkClass}>
							<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
							{t("aml.alerts.backToList")}
						</Link>
						<div className="flex flex-wrap items-center gap-2">
							<span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-600">
								#{alert.id}
							</span>
							<Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
							<Badge>{alert.status}</Badge>
							<Badge variant="neutral">{alert.triggerType}</Badge>
						</div>
						<div>
							<h1 className="font-mono text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{alert.publicRef}</h1>
							<p className="mt-2 text-lg leading-snug text-gray-700">{alert.title}</p>
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
						<Link href={`/aml/cases/new?clientId=${alert.clientId}&alertIds=${alert.id}`} className="inline-flex">
							<Button type="button" variant="default" className="w-full justify-center gap-2 sm:w-auto lg:w-full">
								<FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
								{t("aml.alertDetail.openCase")}
							</Button>
						</Link>
					</div>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3 text-red-800">
					<svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="border-b border-gray-200 bg-gray-50/95 px-5 py-3.5">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.alertDetail.context")}</h2>
				</div>
				<div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
					<MetaField label={t("aml.detail.client")} icon={User}>
						<Link href={`/customers/${alert.clientId}`} className="text-blue-600 hover:text-blue-800 hover:underline">
							{alert.clientId}
						</Link>
					</MetaField>
					{alert.accountId != null ? (
						<MetaField label={t("aml.detail.account")} icon={Wallet}>
							<Link href={`/accounts/${alert.accountId}`} className="text-blue-600 hover:text-blue-800 hover:underline">
								{alert.accountId}
							</Link>
						</MetaField>
					) : (
						<MetaField label={t("aml.detail.account")} icon={Wallet}>
							<span className="font-normal text-gray-400">—</span>
						</MetaField>
					)}
					{alert.transactionId != null ? (
						<MetaField label={t("aml.detail.transaction")} icon={ArrowLeftRight}>
							<Link href={`/transactions/${alert.transactionId}`} className="text-blue-600 hover:text-blue-800 hover:underline">
								{alert.transactionId}
							</Link>
						</MetaField>
					) : (
						<MetaField label={t("aml.detail.transaction")} icon={ArrowLeftRight}>
							<span className="font-normal text-gray-400">—</span>
						</MetaField>
					)}
					<MetaField label={t("aml.detail.assigned")} icon={UserCircle}>
						{alert.assignedToUserId ?? <span className="font-normal text-gray-400">—</span>}
					</MetaField>
					<MetaField label={t("aml.detail.ruleVersion")} icon={Scale} className="sm:col-span-2 lg:col-span-1">
						<span className="font-mono text-xs font-normal text-gray-800">
							{alert.ruleDefinitionId ?? "—"} / {alert.ruleVersionId ?? "—"}
						</span>
					</MetaField>
					<MetaField label={t("aml.detail.idempotency")} icon={Fingerprint} className="sm:col-span-2 lg:col-span-2">
						<span className="break-all font-mono text-xs font-normal text-gray-800">{alert.idempotencyKey ?? "—"}</span>
					</MetaField>
				</div>

				<div className="border-t border-gray-200 bg-slate-50/60 px-5 py-3.5">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.alertDetail.timeline")}</h2>
				</div>
				<div className="grid gap-3 p-5 sm:grid-cols-3">
					<MetaField label={t("aml.detail.createdAt")} icon={CalendarClock}>
						{formatDateTime(alert.createdAt, lang)}
					</MetaField>
					<MetaField label={t("aml.detail.updatedAt")} icon={CalendarClock}>
						{formatDateTime(alert.updatedAt, lang)}
					</MetaField>
					<MetaField label={t("aml.detail.closedAt")} icon={Lock}>
						{formatDateTime(alert.closedAt, lang)}
					</MetaField>
					{alert.closureReasonCode ? (
						<MetaField label={t("aml.detail.closureReason")} icon={ListChecks} className="sm:col-span-3">
							<span className="font-mono text-xs">{alert.closureReasonCode}</span>
							{alert.closureComment ? (
								<p className="mt-2 whitespace-pre-wrap text-sm font-normal text-gray-600">{alert.closureComment}</p>
							) : null}
						</MetaField>
					) : null}
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/95 px-5 py-3.5">
					<Code2 className="h-4 w-4 text-gray-500" aria-hidden />
					<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.detail.facts")}</h2>
				</div>
				<div className="p-1 sm:p-2">
					<pre className="max-h-[28rem] overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 ring-1 ring-slate-800/80 sm:text-[13px]">
						{factsPretty || "{}"}
					</pre>
				</div>
			</div>

			{alert.status !== "CLOSED" && (
				<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
					<div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 px-5 py-4">
						<h2 className="text-lg font-semibold text-gray-900">{t("aml.alertDetail.actions")}</h2>
					</div>
					<div className="divide-y divide-gray-100">
						<div className="flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-end">
							<div className="min-w-[220px] flex-1 max-w-xl">
								<label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700" htmlFor="aml-alert-assignee">
									<User className="h-4 w-4 text-gray-400" aria-hidden />
									{t("aml.alertDetail.assignToUser")}
								</label>
								<select
									id="aml-alert-assignee"
									className={SELECT_CLASS}
									value={assigneeId}
									onChange={(e) => setAssigneeId(e.target.value)}
									disabled={busy || assignUsersLoading || assignUsersError != null}
								>
									<option value="">
										{assignUsersLoading ? t("aml.loading") : t("aml.alertDetail.assignSelectPlaceholder")}
									</option>
									{assignUsers.map((u) => (
										<option key={u.id} value={String(u.id)}>
											{formatUserLabel(u)}
										</option>
									))}
								</select>
								{assignUsersError ? (
									<p className="mt-2 text-sm text-red-600">
										{t("aml.alertDetail.usersLoadError")} {assignUsersError}
									</p>
								) : null}
							</div>
							<Button
								type="button"
								className="h-10 shrink-0 gap-2 sm:min-w-[8rem]"
								onClick={assign}
								disabled={busy || !assigneeId || assignUsersLoading}
							>
								<UserPlus className="h-4 w-4" aria-hidden />
								{t("aml.alertDetail.assign")}
							</Button>
						</div>

						<div className="flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-end">
							<div className="min-w-[200px]">
								<label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
									<ListChecks className="h-4 w-4 text-gray-400" aria-hidden />
									{t("aml.filters.status")}
								</label>
								<select
									className={SELECT_CLASS}
									value={nextStatus || alert.status}
									onChange={(e) => setNextStatus(e.target.value as AmlAlertStatus)}
								>
									{STATUSES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>
							<Button type="button" variant="outline" className="h-10 shrink-0 gap-2" onClick={patchStatus} disabled={busy || !nextStatus}>
								<RefreshCw className="h-4 w-4" aria-hidden />
								{t("aml.alertDetail.updateStatus")}
							</Button>
						</div>

						<div className="space-y-4 p-5">
							<label className="flex items-center gap-2 text-sm font-medium text-gray-700">
								<Lock className="h-4 w-4 text-gray-400" aria-hidden />
								{t("aml.alertDetail.closure")}
							</label>
							<div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
								<select
									className={`${SELECT_CLASS} lg:min-w-[220px]`}
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
									className="h-10 min-w-0 flex-1 lg:min-w-[240px]"
									placeholder={t("aml.alertDetail.closureComment")}
									value={closureComment}
									onChange={(e) => setClosureComment(e.target.value)}
								/>
								<Button type="button" variant="secondary" className="h-10 shrink-0 gap-2 lg:min-w-[10rem]" onClick={close} disabled={busy}>
									<Lock className="h-4 w-4" aria-hidden />
									{t("aml.alertDetail.closeAlert")}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
