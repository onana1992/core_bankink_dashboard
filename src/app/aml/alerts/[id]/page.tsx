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
import type { AmlAlertResponse, AmlAlertStatus, AmlClosureReason, AmlAlertSeverity, User as AppUser } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { OPS_CARD_HEADER, OPS_CARD_SHELL, OPS_SELECT, OpsField, OpsInlineAlert, OpsSelect } from "@/components/ops";

const STATUSES: AmlAlertStatus[] = ["NEW", "ASSIGNED", "UNDER_REVIEW", "ESCALATED", "CLOSED"];
const CLOSURES: AmlClosureReason[] = ["FALSE_POSITIVE", "EXPLAINED", "ESCALATED_DECLARATION", "OTHER"];

const OPS_INPUT_CLASS =
	`${OPS_SELECT} h-10 py-0 shadow-none`;

const OPS_TEXTAREA_CLASS =
	"w-full min-h-[5.5rem] resize-y rounded-ops-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-fg shadow-sm focus:border-ops-ring focus:outline-none focus:ring-2 focus:ring-ops-ring/25";

function ActionBlock({
	title,
	description,
	icon: Icon,
	tone = "default",
	children
}: {
	title: string;
	description?: string;
	icon: ElementType;
	tone?: "default" | "closure";
	children: React.ReactNode;
}) {
	const headerTone =
		tone === "closure"
			? "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
			: "border-ops-border/60 bg-ops-surface-muted/50";
	const iconTone =
		tone === "closure"
			? "bg-amber-100/80 text-amber-800 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900/50"
			: "bg-ops-surface text-ops-fg-muted ring-ops-border";

	return (
		<section className="border-b border-ops-border last:border-b-0">
			<div className={`border-b px-5 py-3.5 sm:px-6 ${headerTone}`}>
				<div className="flex items-start gap-3">
					<div
						className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ops-md ring-1 ${iconTone}`}
						aria-hidden
					>
						<Icon className="h-4 w-4" />
					</div>
					<div className="min-w-0 pt-0.5">
						<h3 className="text-sm font-semibold tracking-tight text-ops-fg">{title}</h3>
						{description ? <p className="mt-0.5 text-xs leading-relaxed text-ops-fg-muted">{description}</p> : null}
					</div>
				</div>
			</div>
			<div className="bg-ops-surface px-5 py-5 sm:px-6">{children}</div>
		</section>
	);
}

function ActionRow({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">{children}</div>;
}

function severityVariant(s: AmlAlertSeverity): "neutral" | "info" | "warning" | "danger" {
	if (s === "CRITICAL" || s === "HIGH") return "danger";
	if (s === "MEDIUM") return "warning";
	if (s === "LOW" || s === "INFO") return "info";
	return "neutral";
}

function formatUserLabel(u: AppUser): string {
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
		<div className={`rounded-ops-xl border border-ops-border bg-ops-surface-muted/40 p-4 shadow-sm ${className}`}>
			<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ops-fg-muted">
				<Icon className="h-3.5 w-3.5 shrink-0 text-ops-fg-muted" aria-hidden />
				{label}
			</div>
			<div className="mt-2 min-h-[1.25rem] text-sm font-medium text-ops-fg">{children}</div>
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
	const [assignUsers, setAssignUsers] = useState<AppUser[]>([]);
	const [assignUsersLoading, setAssignUsersLoading] = useState(true);
	const [assignUsersError, setAssignUsersError] = useState<string | null>(null);
	const [nextStatus, setNextStatus] = useState<AmlAlertStatus | "">("");
	const [closureReason, setClosureReason] = useState<AmlClosureReason>("FALSE_POSITIVE");
	const [closureComment, setClosureComment] = useState("");
	const [busy, setBusy] = useState(false);
	const [existingCaseId, setExistingCaseId] = useState("");

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
			const selected = assignUsers.find((u) => u.id === uid);
			const a = await amlApi.assignAlert(id, { assigneeUserId: uid });
			setAlert({
				...a,
				assignedToUserId: a.assignedToUserId ?? uid,
				assignedToUsername: a.assignedToUsername?.trim() || selected?.username || null
			});
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

	async function addToExistingCase() {
		const caseId = Number(existingCaseId);
		if (!Number.isFinite(caseId) || caseId <= 0) return;
		setBusy(true);
		setError(null);
		try {
			await amlApi.addCaseAlerts(caseId, { alertIds: [Number(id)] });
			setExistingCaseId("");
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("show-toast", {
						detail: { message: t("aml.cases.addAlertsSuccess"), type: "success" }
					})
				);
			}
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

	const assignedUsername = useMemo(() => {
		const fromApi = alert?.assignedToUsername?.trim();
		if (fromApi) return fromApi;
		if (!alert?.assignedToUserId) return null;
		return assignUsers.find((u) => u.id === alert.assignedToUserId)?.username ?? null;
	}, [alert?.assignedToUsername, alert?.assignedToUserId, assignUsers]);

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
					<div className="flex w-full shrink-0 flex-row flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
						<Link href={`/aml/cases/new?clientId=${alert.clientId}&alertIds=${alert.id}`} className="inline-flex shrink-0">
							<Button type="button" variant="default" className="justify-center gap-2">
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

			<div className={OPS_CARD_SHELL}>
				<div className={OPS_CARD_HEADER}>
					<h2 className="text-sm font-semibold uppercase tracking-wide text-ops-fg">{t("aml.alertDetail.context")}</h2>
				</div>
				<div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:px-6">
					<MetaField label={t("aml.detail.client")} icon={User}>
						<Link href={`/customers/${alert.clientId}`} className="text-ops-ring hover:underline">
							{alert.clientId}
						</Link>
					</MetaField>
					{alert.accountId != null ? (
						<MetaField label={t("aml.detail.account")} icon={Wallet}>
							<Link href={`/accounts/${alert.accountId}`} className="text-ops-ring hover:underline">
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
							<Link href={`/transactions/${alert.transactionId}`} className="text-ops-ring hover:underline">
								{alert.transactionId}
							</Link>
						</MetaField>
					) : (
						<MetaField label={t("aml.detail.transaction")} icon={ArrowLeftRight}>
							<span className="font-normal text-gray-400">—</span>
						</MetaField>
					)}
					<MetaField label={t("aml.detail.assigned")} icon={UserCircle}>
						{assignedUsername ? (
							<Link href={`/users/${alert.assignedToUserId}`} className="text-ops-ring hover:underline">
								{assignedUsername}
							</Link>
						) : alert.assignedToUserId != null ? (
							assignUsersLoading ? (
								<span className="font-normal text-gray-400">…</span>
							) : (
								<span className="font-mono text-xs font-normal text-gray-600">#{alert.assignedToUserId}</span>
							)
						) : (
							<span className="font-normal text-gray-400">—</span>
						)}
					</MetaField>
					<MetaField label={t("aml.detail.ruleVersion")} icon={Scale} className="sm:col-span-2 lg:col-span-1">
						<span className="font-mono text-xs font-normal text-gray-800">
							{alert.ruleCode ?? "—"} / {alert.ruleVersionNumber ?? "—"}
						</span>
					</MetaField>
					<MetaField label={t("aml.detail.idempotency")} icon={Fingerprint} className="sm:col-span-2 lg:col-span-2">
						<span className="break-all font-mono text-xs font-normal text-gray-800">{alert.idempotencyKey ?? "—"}</span>
					</MetaField>
				</div>

				<div className="border-t border-ops-border bg-ops-surface-muted/50 px-5 py-3.5 sm:px-6">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-ops-fg-muted">{t("aml.alertDetail.timeline")}</h2>
				</div>
				<div className="grid gap-3 p-5 sm:grid-cols-3 sm:px-6 sm:pb-6">
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

			<div className={OPS_CARD_SHELL}>
				<div className={`${OPS_CARD_HEADER} flex items-center gap-2`}>
					<Code2 className="h-4 w-4 text-ops-fg-muted" aria-hidden />
					<h2 className="text-sm font-semibold uppercase tracking-wide text-ops-fg">{t("aml.detail.facts")}</h2>
				</div>
				<div className="p-1 sm:p-2">
					<pre className="max-h-[28rem] overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 ring-1 ring-slate-800/80 sm:text-[13px]">
						{factsPretty || "{}"}
					</pre>
				</div>
			</div>

			{alert.status !== "CLOSED" && (
				<div className={OPS_CARD_SHELL}>
					<div className={`${OPS_CARD_HEADER} flex items-center gap-3`}>
						<div
							className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ops-md bg-ops-surface text-ops-fg-muted ring-1 ring-ops-border"
							aria-hidden
						>
							<ListChecks className="h-4 w-4" />
						</div>
						<div>
							<h2 className="text-lg font-semibold tracking-tight text-ops-fg">{t("aml.alertDetail.actions")}</h2>
							<p className="mt-0.5 text-xs text-ops-fg-muted">{t("aml.alertDetail.actionsHint")}</p>
						</div>
					</div>

					<ActionBlock title={t("aml.alertDetail.assignToUser")} icon={UserPlus}>
						<ActionRow>
							<OpsField htmlFor="aml-alert-assignee" label={t("aml.alertDetail.assignSelectPlaceholder")} className="min-w-[220px] flex-1">
								<OpsSelect
									id="aml-alert-assignee"
									className="h-10"
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
								</OpsSelect>
							</OpsField>
							<Button
								type="button"
								className="h-10 w-full shrink-0 gap-2 sm:w-auto sm:min-w-[9.5rem]"
								onClick={assign}
								disabled={busy || !assigneeId || assignUsersLoading}
							>
								<UserPlus className="h-4 w-4" aria-hidden />
								{t("aml.alertDetail.assign")}
							</Button>
						</ActionRow>
						{assignUsersError ? (
							<OpsInlineAlert variant="error" className="mt-4">
								{t("aml.alertDetail.usersLoadError")} {assignUsersError}
							</OpsInlineAlert>
						) : null}
					</ActionBlock>

					<ActionBlock
						title={t("aml.alertDetail.linkToCase")}
						description={t("aml.alertDetail.linkToCaseHint")}
						icon={FolderKanban}
					>
						<ActionRow>
							<OpsField htmlFor="aml-alert-existing-case" label={t("aml.cases.existingCaseId")} className="min-w-[220px] flex-1">
								<Input
									id="aml-alert-existing-case"
									className={OPS_INPUT_CLASS}
									value={existingCaseId}
									onChange={(e) => setExistingCaseId(e.target.value)}
									placeholder={t("aml.cases.existingCaseId")}
									inputMode="numeric"
									disabled={busy}
								/>
							</OpsField>
							<Button
								type="button"
								variant="outline"
								className="h-10 w-full shrink-0 gap-2 sm:w-auto sm:min-w-[10rem]"
								onClick={() => void addToExistingCase()}
								disabled={busy || !existingCaseId.trim()}
							>
								<FolderKanban className="h-4 w-4" aria-hidden />
								{t("aml.cases.addToCaseSubmit")}
							</Button>
						</ActionRow>
					</ActionBlock>

					<ActionBlock title={t("aml.filters.status")} description={t("aml.alertDetail.updateStatusHint")} icon={RefreshCw}>
						<ActionRow>
							<OpsField htmlFor="aml-alert-status" label={t("aml.filters.status")} className="min-w-[200px] flex-1 sm:max-w-xs">
								<OpsSelect
									id="aml-alert-status"
									className="h-10"
									value={nextStatus || alert.status}
									onChange={(e) => setNextStatus(e.target.value as AmlAlertStatus)}
									disabled={busy}
								>
									{STATUSES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</OpsSelect>
							</OpsField>
							<Button
								type="button"
								variant="outline"
								className="h-10 w-full shrink-0 gap-2 sm:w-auto sm:min-w-[10rem]"
								onClick={patchStatus}
								disabled={busy || !nextStatus || nextStatus === alert.status}
							>
								<RefreshCw className="h-4 w-4" aria-hidden />
								{t("aml.alertDetail.updateStatus")}
							</Button>
						</ActionRow>
					</ActionBlock>

					<ActionBlock
						title={t("aml.alertDetail.closure")}
						description={t("aml.alertDetail.closureHint")}
						icon={Lock}
						tone="closure"
					>
						<div className="space-y-4">
							<ActionRow>
								<OpsField htmlFor="aml-alert-closure-reason" label={t("aml.detail.closureReason")} className="min-w-[200px] flex-1 sm:max-w-xs">
									<OpsSelect
										id="aml-alert-closure-reason"
										className="h-10"
										value={closureReason}
										onChange={(e) => setClosureReason(e.target.value as AmlClosureReason)}
										disabled={busy}
									>
										{CLOSURES.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</OpsSelect>
								</OpsField>
								<Button
									type="button"
									variant="secondary"
									className="h-10 w-full shrink-0 gap-2 sm:w-auto sm:min-w-[10rem]"
									onClick={close}
									disabled={busy}
								>
									<Lock className="h-4 w-4" aria-hidden />
									{t("aml.alertDetail.closeAlert")}
								</Button>
							</ActionRow>
							<OpsField htmlFor="aml-alert-closure-comment" label={t("aml.alertDetail.closureComment")}>
								<textarea
									id="aml-alert-closure-comment"
									className={OPS_TEXTAREA_CLASS}
									placeholder={t("aml.alertDetail.closureComment")}
									value={closureComment}
									onChange={(e) => setClosureComment(e.target.value)}
									rows={3}
									disabled={busy}
								/>
							</OpsField>
						</div>
					</ActionBlock>
				</div>
			)}
		</div>
	);
}
