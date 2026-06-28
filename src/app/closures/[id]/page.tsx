"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
	ArrowLeft,
	ArrowDownLeft,
	ArrowUpRight,
	Calendar,
	CalendarCheck,
	CalendarClock,
	CheckCircle2,
	ClipboardList,
	Clock,
	ExternalLink,
	Loader2,
	OctagonAlert,
	Scale,
	TriangleAlert,
	User,
	XCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { closuresApi } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Closure, ClosureStatus, ClosureType, ClosureValidationResponse, YearEndClosingDetail } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
	OPS_CARD_HEADER,
	OPS_CARD_SHELL,
	OPS_PAGE_STACK,
	OpsInlineAlert,
	OpsLoadingState
} from "@/components/ops";

const TYPE_LABELS: Record<ClosureType, string> = {
	DAILY: "Journalière",
	MONTHLY: "Mensuelle",
	YEARLY: "Annuelle"
};

const TYPE_ICONS: Record<ClosureType, ElementType> = {
	DAILY: CalendarCheck,
	MONTHLY: CalendarClock,
	YEARLY: Calendar
};

const STATUS_LABELS: Record<ClosureStatus, string> = {
	IN_PROGRESS: "En cours",
	COMPLETED: "Complétée",
	FAILED: "Échouée"
};

const STATUS_BADGE: Record<ClosureStatus, string> = {
	IN_PROGRESS: "border-amber-200 bg-amber-100 text-amber-900",
	COMPLETED: "border-emerald-200 bg-emerald-100 text-emerald-900",
	FAILED: "border-red-200 bg-red-100 text-red-900"
};

const STATUS_HERO: Record<ClosureStatus, string> = {
	IN_PROGRESS: "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/40",
	COMPLETED: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40",
	FAILED: "border-red-200/80 bg-gradient-to-br from-red-50 via-white to-red-50/40"
};

const STATUS_ICON_RING: Record<ClosureStatus, string> = {
	IN_PROGRESS: "bg-amber-100 text-amber-700 ring-amber-200",
	COMPLETED: "bg-emerald-100 text-emerald-700 ring-emerald-200",
	FAILED: "bg-red-100 text-red-700 ring-red-200"
};

function formatDateOnly(dateString: string): string {
	const [y, m, d] = dateString.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric"
	});
}

function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
	} catch {
		return "—";
	}
}

function MetaField({
	label,
	icon: Icon,
	children,
	className
}: {
	label: string;
	icon: ElementType;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("rounded-ops-xl border border-ops-border bg-ops-surface-muted/40 p-4 shadow-sm", className)}>
			<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ops-fg-muted">
				<Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
				{label}
			</div>
			<div className="mt-2 min-h-[1.25rem] text-sm font-medium text-ops-fg">{children}</div>
		</div>
	);
}

function KpiCard({
	label,
	value,
	icon: Icon,
	tone = "neutral"
}: {
	label: string;
	value: string;
	icon: ElementType;
	tone?: "debit" | "credit" | "neutral" | "success" | "danger";
}) {
	const toneClass = {
		debit: "border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white text-blue-950",
		credit: "border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white text-violet-950",
		neutral: "border-ops-border bg-ops-surface text-ops-fg",
		success: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white text-emerald-950",
		danger: "border-red-200/80 bg-gradient-to-br from-red-50/80 to-white text-red-950"
	}[tone];

	const iconClass = {
		debit: "bg-blue-100 text-blue-700 ring-blue-200/80",
		credit: "bg-violet-100 text-violet-700 ring-violet-200/80",
		neutral: "bg-ops-surface-muted text-ops-fg-muted ring-ops-border",
		success: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
		danger: "bg-red-100 text-red-700 ring-red-200/80"
	}[tone];

	return (
		<div className={cn("rounded-ops-xl border p-5 shadow-sm", toneClass)}>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
					<p className="mt-2 font-mono text-2xl font-bold tracking-tight">{value}</p>
				</div>
				<div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-ops-md ring-1", iconClass)}>
					<Icon className="h-5 w-5" aria-hidden />
				</div>
			</div>
		</div>
	);
}

function SectionCard({
	title,
	description,
	icon: Icon,
	children
}: {
	title: string;
	description?: string;
	icon: ElementType;
	children: React.ReactNode;
}) {
	return (
		<section className={OPS_CARD_SHELL}>
			<div className={OPS_CARD_HEADER}>
				<div className="flex items-start gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ops-md bg-ops-surface text-ops-fg-muted ring-1 ring-ops-border">
						<Icon className="h-4 w-4" aria-hidden />
					</div>
					<div className="min-w-0">
						<h2 className="text-sm font-semibold tracking-tight text-ops-fg">{title}</h2>
						{description ? (
							<p className="mt-0.5 text-xs leading-relaxed text-ops-fg-muted">{description}</p>
						) : null}
					</div>
				</div>
			</div>
			<div className="p-5 sm:p-6">{children}</div>
		</section>
	);
}

export default function ClosureDetailPage() {
	const params = useParams();
	const router = useRouter();
	const closureId = params.id as string;
	const { isAuthenticated, loading: authLoading } = useAuth();

	const [closure, setClosure] = useState<Closure | null>(null);
	const [validation, setValidation] = useState<ClosureValidationResponse | null>(null);
	const [yearEndDetail, setYearEndDetail] = useState<YearEndClosingDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [validating, setValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (authLoading) return;
		if (!isAuthenticated) return;
		if (closureId) {
			loadClosure();
		}
	}, [closureId, authLoading, isAuthenticated]);

	async function loadClosure() {
		setLoading(true);
		setError(null);
		try {
			const data = await closuresApi.getClosure(closureId);
			setClosure(data);
			if (data.closureType === "YEARLY" && data.status === "COMPLETED") {
				try {
					setYearEndDetail(await closuresApi.getYearEndDetail(closureId));
				} catch {
					setYearEndDetail(null);
				}
			} else {
				setYearEndDetail(null);
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Erreur lors du chargement de la clôture";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	async function handleValidate() {
		if (!closure) return;
		setValidating(true);
		setError(null);
		try {
			const validationResult = await closuresApi.validateClosure(closureId);
			setValidation(validationResult);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Erreur lors de la validation";
			setError(msg);
		} finally {
			setValidating(false);
		}
	}

	const balanceGap = useMemo(() => {
		if (!closure) return 0;
		return Math.abs(closure.totalDebit - closure.totalCredit);
	}, [closure]);

	if (authLoading) {
		return <OpsLoadingState message="Chargement…" />;
	}

	if (!isAuthenticated) {
		router.push("/login");
		return null;
	}

	if (loading) {
		return <OpsLoadingState message="Chargement de la clôture…" />;
	}

	if (!closure) {
		return (
			<div className={OPS_PAGE_STACK}>
				<OpsInlineAlert variant="error">
					<OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" />
					<p>{error || "Clôture non trouvée"}</p>
				</OpsInlineAlert>
				<Link
					href="/closures"
					className="inline-flex items-center gap-2 text-sm font-medium text-ops-ring hover:underline"
				>
					<ArrowLeft className="h-4 w-4" />
					Retour à la liste
				</Link>
			</div>
		);
	}

	const TypeIcon = TYPE_ICONS[closure.closureType];
	const StatusIcon =
		closure.status === "COMPLETED" ? CheckCircle2 : closure.status === "FAILED" ? XCircle : Clock;

	return (
		<div className={OPS_PAGE_STACK}>
			<Link
				href="/closures"
				className="inline-flex w-fit items-center gap-2 text-sm font-medium text-ops-fg-muted transition-colors hover:text-ops-fg"
			>
				<ArrowLeft className="h-4 w-4" />
				Retour aux clôtures
			</Link>

			<div className={cn("overflow-hidden rounded-ops-xl border p-5 shadow-sm sm:p-6", STATUS_HERO[closure.status])}>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-4">
						<div
							className={cn(
								"flex h-12 w-12 shrink-0 items-center justify-center rounded-ops-lg ring-1",
								STATUS_ICON_RING[closure.status]
							)}
						>
							<TypeIcon className="h-6 w-6" aria-hidden />
						</div>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="text-2xl font-bold tracking-tight text-ops-fg sm:text-3xl">
									Clôture #{closure.id}
								</h1>
								<Badge className={cn("border", STATUS_BADGE[closure.status])}>
									<StatusIcon className="mr-1 inline h-3.5 w-3.5" />
									{STATUS_LABELS[closure.status]}
								</Badge>
							</div>
							<p className="mt-1 text-sm text-ops-fg-muted sm:text-base">
								{TYPE_LABELS[closure.closureType]} — {formatDateOnly(closure.closureDate)}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link href="/balance-snapshots">
							<Button variant="secondary" className="inline-flex items-center gap-2">
								<ExternalLink className="h-4 w-4" />
								Snapshots GL
							</Button>
						</Link>
						<Button onClick={handleValidate} disabled={validating} className="inline-flex items-center gap-2">
							{validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
							{validating ? "Validation…" : "Relancer les contrôles"}
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<OpsInlineAlert variant="error">
					<OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" />
					<p>{error}</p>
				</OpsInlineAlert>
			)}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<KpiCard
					label="Total débit"
					value={formatAmount(closure.totalDebit, "XAF")}
					icon={ArrowUpRight}
					tone="debit"
				/>
				<KpiCard
					label="Total crédit"
					value={formatAmount(closure.totalCredit, "XAF")}
					icon={ArrowDownLeft}
					tone="credit"
				/>
				<KpiCard
					label="Contrôle équilibre"
					value={closure.balanceCheck ? "Équilibré" : formatAmount(balanceGap, "XAF")}
					icon={closure.balanceCheck ? CheckCircle2 : TriangleAlert}
					tone={closure.balanceCheck ? "success" : "danger"}
				/>
			</div>

			<SectionCard
				title="Informations générales"
				description="Identité de la clôture, horodatages et commentaires"
				icon={ClipboardList}
			>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<MetaField label="Type" icon={TypeIcon}>
						{TYPE_LABELS[closure.closureType]}
					</MetaField>
					<MetaField label="Date comptable" icon={Calendar}>
						{formatDateOnly(closure.closureDate)}
					</MetaField>
					<MetaField label="Statut" icon={StatusIcon}>
						<Badge className={cn("border", STATUS_BADGE[closure.status])}>
							{STATUS_LABELS[closure.status]}
						</Badge>
					</MetaField>
					<MetaField label="Créée le" icon={Clock}>
						{formatDateTime(closure.createdAt)}
					</MetaField>
					<MetaField label="Finalisée le" icon={CheckCircle2}>
						{formatDateTime(closure.completedAt)}
					</MetaField>
					<MetaField label="Opérateur" icon={User}>
						{closure.createdBy != null ? `#${closure.createdBy}` : "Système (job automatique)"}
					</MetaField>
				</div>

				{closure.description ? (
					<div className="mt-4 rounded-ops-lg border border-ops-border bg-ops-surface-muted/30 p-4">
						<p className="text-[11px] font-semibold uppercase tracking-wide text-ops-fg-muted">Commentaire</p>
						<p className="mt-2 text-sm leading-relaxed text-ops-fg">{closure.description}</p>
					</div>
				) : null}

				{closure.errorMessage ? (
					<OpsInlineAlert variant="error" className="mt-4">
						<OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" />
						<div>
							<p className="font-semibold">Message d&apos;erreur</p>
							<p className="mt-1 whitespace-pre-wrap">{closure.errorMessage}</p>
						</div>
					</OpsInlineAlert>
				) : null}
			</SectionCard>

			{closure.closureType === "YEARLY" && (closure.netResult != null || yearEndDetail) ? (
				<SectionCard
					title="Résultat de l'exercice"
					description="Écritures 131/132 et report à nouveau 121/122"
					icon={Scale}
				>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<MetaField label="Exercice" icon={Calendar}>
							{closure.fiscalYear ?? yearEndDetail?.fiscalYear ?? "—"}
						</MetaField>
						<MetaField label="Résultat net" icon={ArrowUpRight}>
							{closure.netResult != null ? formatAmount(closure.netResult, "XAF") : "—"}
						</MetaField>
						<MetaField label="Type" icon={CheckCircle2}>
							{closure.resultType ?? yearEndDetail?.resultType ?? "—"}
						</MetaField>
					</div>
					{yearEndDetail?.journalBatchId ? (
						<div className="mt-4">
							<Link
								href={`/journal-batches/${yearEndDetail.journalBatchId}`}
								className="inline-flex items-center gap-2 text-sm font-medium text-ops-ring hover:underline"
							>
								<ExternalLink className="h-4 w-4" />
								Lot {yearEndDetail.journalBatchNumber ?? yearEndDetail.journalBatchId}
							</Link>
						</div>
					) : null}
				</SectionCard>
			) : null}

			{validation ? (
				<SectionCard
					title="Résultat des contrôles"
					description="Équilibre GL, séquence des transactions et rapprochement métier ↔ GL"
					icon={Scale}
				>
					<div className="space-y-4">
						<OpsInlineAlert variant={validation.isValid ? "success" : "error"}>
							{validation.isValid ? (
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
							) : (
								<XCircle className="mt-0.5 h-4 w-4 shrink-0" />
							)}
							<div>
								<p className="font-semibold">{validation.isValid ? "Contrôles valides" : "Contrôles en échec"}</p>
								<p className="mt-1">{validation.message}</p>
							</div>
						</OpsInlineAlert>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<MetaField label="Débit cumulé" icon={ArrowUpRight}>
								<span className="font-mono">{formatAmount(validation.totalDebit, "XAF")}</span>
							</MetaField>
							<MetaField label="Crédit cumulé" icon={ArrowDownLeft}>
								<span className="font-mono">{formatAmount(validation.totalCredit, "XAF")}</span>
							</MetaField>
							<MetaField label="Écart" icon={Scale}>
								<span className="font-mono">{formatAmount(validation.difference, "XAF")}</span>
							</MetaField>
						</div>

						{validation.errors.length > 0 ? (
							<div className="rounded-ops-lg border border-red-200 bg-red-50/60 p-4">
								<p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-800">
									<XCircle className="h-3.5 w-3.5" />
									Erreurs ({validation.errors.length})
								</p>
								<ul className="mt-3 space-y-2">
									{validation.errors.map((err, index) => (
										<li
											key={index}
											className="rounded-ops-md border border-red-100 bg-white/80 px-3 py-2 text-sm text-red-900"
										>
											{err}
										</li>
									))}
								</ul>
							</div>
						) : null}

						{validation.warnings.length > 0 ? (
							<div className="rounded-ops-lg border border-amber-200 bg-amber-50/60 p-4">
								<p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
									<TriangleAlert className="h-3.5 w-3.5" />
									Avertissements ({validation.warnings.length})
								</p>
								<ul className="mt-3 space-y-2">
									{validation.warnings.map((w, index) => (
										<li
											key={index}
											className="rounded-ops-md border border-amber-100 bg-white/80 px-3 py-2 text-sm text-amber-950"
										>
											{w}
										</li>
									))}
								</ul>
							</div>
						) : null}
					</div>
				</SectionCard>
			) : (
				<div className="rounded-ops-xl border border-dashed border-ops-border bg-ops-surface-muted/20 px-5 py-8 text-center">
					<Scale className="mx-auto h-8 w-8 text-ops-fg-muted/60" />
					<p className="mt-3 text-sm font-medium text-ops-fg">Aucun contrôle relancé pour l&apos;instant</p>
					<p className="mt-1 text-xs text-ops-fg-muted">
						Utilisez « Relancer les contrôles » pour vérifier l&apos;équilibre GL et le rapprochement.
					</p>
				</div>
			)}
		</div>
	);
}
