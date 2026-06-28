"use client";

import type { ElementType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
	ArrowDownLeft,
	ArrowLeft,
	ArrowUpRight,
	BookOpen,
	Calendar,
	CheckCircle2,
	FileSpreadsheet,
	Loader2,
	OctagonAlert,
	RefreshCw,
	Scale,
	TrendingDown,
	TrendingUp,
	TriangleAlert
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { closuresApi } from "@/lib/api";
import { cn, formatAmount } from "@/lib/utils";
import type { CloseYearRequest, YearEndClosingPreview, YearEndResultType } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import {
	OPS_CARD_HEADER,
	OPS_CARD_SHELL,
	OPS_PAGE_STACK,
	OpsInlineAlert,
	OpsLoadingState
} from "@/components/ops";

type PreviewTab = "charges" | "revenues" | "entries";

const RESULT_LABELS: Record<YearEndResultType, string> = {
	PROFIT: "Bénéfice",
	LOSS: "Perte",
	NEUTRE: "Résultat nul"
};

const RESULT_BADGE: Record<YearEndResultType, string> = {
	PROFIT: "border-emerald-200 bg-emerald-100 text-emerald-900",
	LOSS: "border-red-200 bg-red-100 text-red-900",
	NEUTRE: "border-gray-200 bg-gray-100 text-gray-800"
};

const RESULT_HERO: Record<YearEndResultType, string> = {
	PROFIT: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40",
	LOSS: "border-red-200/80 bg-gradient-to-br from-red-50 via-white to-red-50/40",
	NEUTRE: "border-gray-200/80 bg-gradient-to-br from-gray-50 via-white to-gray-50/40"
};

function formatDateOnly(dateString: string): string {
	const [y, m, d] = dateString.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric"
	});
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
		debit: "border-red-200/80 bg-gradient-to-br from-red-50/80 to-white text-red-950",
		credit: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white text-emerald-950",
		neutral: "border-ops-border bg-ops-surface text-ops-fg",
		success: "border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white text-violet-950",
		danger: "border-red-200/80 bg-gradient-to-br from-red-50/80 to-white text-red-950"
	}[tone];

	const iconClass = {
		debit: "bg-red-100 text-red-700 ring-red-200/80",
		credit: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
		neutral: "bg-ops-surface-muted text-ops-fg-muted ring-ops-border",
		success: "bg-violet-100 text-violet-700 ring-violet-200/80",
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

function AmountCell({ amount }: { amount: number }) {
	if (amount <= 0) return <span className="text-ops-fg-muted">—</span>;
	return (
		<span className="font-mono tabular-nums">{formatAmount(amount, "XAF")}</span>
	);
}

export default function YearEndPreviewPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, loading: authLoading } = useAuth();

	const initialYear = useMemo(() => {
		const fromQuery = parseInt(searchParams.get("year") ?? "", 10);
		if (!Number.isNaN(fromQuery) && fromQuery >= 2000 && fromQuery <= 2100) {
			return fromQuery;
		}
		return new Date().getFullYear() - 1;
	}, [searchParams]);

	const [year, setYear] = useState(initialYear);
	const [description, setDescription] = useState("");
	const [preview, setPreview] = useState<YearEndClosingPreview | null>(null);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<PreviewTab>("charges");

	const loadPreview = useCallback(async (targetYear: number) => {
		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			const data = await closuresApi.previewCloseYear(targetYear);
			setPreview(data);
			router.replace(`/closures/year-end/preview?year=${targetYear}`, { scroll: false });
		} catch (e: unknown) {
			setPreview(null);
			setError(e instanceof Error ? e.message : "Erreur lors de la prévisualisation");
		} finally {
			setLoading(false);
		}
	}, [router]);

	useEffect(() => {
		if (authLoading || !isAuthenticated) return;
		loadPreview(initialYear);
	}, [authLoading, isAuthenticated, initialYear, loadPreview]);

	const entryTotals = useMemo(() => {
		if (!preview) return { debit: 0, credit: 0, balanced: true };
		const debit = preview.proposedEntries.reduce((sum, e) => sum + e.debitAmount, 0);
		const credit = preview.proposedEntries.reduce((sum, e) => sum + e.creditAmount, 0);
		return {
			debit,
			credit,
			balanced: Math.abs(debit - credit) < 0.01
		};
	}, [preview]);

	async function handleCloseYear() {
		if (!preview) return;
		const confirmed = window.confirm(
			`Confirmer la clôture annuelle de l'exercice ${preview.year} ?\n\n` +
				`Résultat : ${formatAmount(preview.netResult, "XAF")} (${RESULT_LABELS[preview.resultType]})\n` +
				`${preview.proposedEntries.length} écriture(s) seront générées.`
		);
		if (!confirmed) return;

		setSubmitting(true);
		setError(null);
		setSuccess(null);
		try {
			const payload: CloseYearRequest = { year: preview.year, description: description.trim() || undefined };
			const result = await closuresApi.closeYear(payload);
			if (result.kind === "submitted") {
				setSuccess(`Demande de clôture annuelle soumise (n°${result.request.id}) — en attente de validation.`);
			} else {
				router.push(`/closures/${result.closure.id}`);
				return;
			}
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Erreur lors de la clôture annuelle");
		} finally {
			setSubmitting(false);
		}
	}

	if (authLoading) {
		return <OpsLoadingState message="Chargement…" />;
	}

	if (!isAuthenticated) {
		router.push("/login");
		return null;
	}

	return (
		<div className={OPS_PAGE_STACK}>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<Link
						href="/closures"
						className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-ops-fg-muted hover:text-ops-fg"
					>
						<ArrowLeft className="h-4 w-4" />
						Retour aux clôtures
					</Link>
					<h1 className="text-2xl font-bold tracking-tight text-ops-fg sm:text-3xl">
						Prévisualisation — clôture annuelle
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-ops-fg-muted">
						Simulation des soldes de gestion (charges et produits XAF) et des écritures pro forma de clôture
						(comptes 131/132 puis affectation 121/122).
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						disabled={loading}
						onClick={() => loadPreview(year)}
						className="inline-flex items-center gap-2"
					>
						{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
						Actualiser
					</Button>
					{preview ? (
						<Button
							disabled={submitting || preview.proposedEntries.length === 0}
							onClick={handleCloseYear}
							className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700"
						>
							{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							Lancer la clôture
						</Button>
					) : null}
				</div>
			</div>

			<section className={OPS_CARD_SHELL}>
				<div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-6">
					<div className="w-full max-w-xs">
						<Input
							label="Exercice (année)"
							type="number"
							min={2000}
							max={2100}
							value={year}
							onChange={(e) => setYear(parseInt(e.target.value, 10) || initialYear)}
						/>
					</div>
					<div className="flex-1">
						<Input
							label="Commentaire pour la clôture (optionnel)"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Ex. Clôture exercice 2025 — revue direction"
						/>
					</div>
					<Button disabled={loading} onClick={() => loadPreview(year)} className="shrink-0">
						{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						Charger la prévisualisation
					</Button>
				</div>
			</section>

			{success ? (
				<OpsInlineAlert variant="success">
					<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
					<p>{success}</p>
				</OpsInlineAlert>
			) : null}

			{error ? (
				<OpsInlineAlert variant="error">
					<OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" />
					<p>{error}</p>
				</OpsInlineAlert>
			) : null}

			{loading && !preview ? <OpsLoadingState message="Calcul de la prévisualisation…" /> : null}

			{preview ? (
				<>
					<section className={cn("rounded-ops-xl border p-5 shadow-sm sm:p-6", RESULT_HERO[preview.resultType])}>
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
									Exercice {preview.year}
								</p>
								<h2 className="mt-1 text-xl font-bold text-ops-fg sm:text-2xl">
									Résultat net : {formatAmount(preview.netResult, "XAF")}
								</h2>
								<div className="mt-3 flex flex-wrap items-center gap-2">
									<Badge className={cn("border", RESULT_BADGE[preview.resultType])}>
										{RESULT_LABELS[preview.resultType]}
									</Badge>
									<span className="text-sm text-ops-fg-muted">
										Arrêté au {formatDateOnly(preview.asOfDate)}
									</span>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
								<MetaField label="Total charges" icon={TrendingDown}>
									<span className="font-mono text-red-700">{formatAmount(preview.totalCharges, "XAF")}</span>
								</MetaField>
								<MetaField label="Total produits" icon={TrendingUp}>
									<span className="font-mono text-emerald-700">
										{formatAmount(preview.totalRevenues, "XAF")}
									</span>
								</MetaField>
								<MetaField label="Écritures pro forma" icon={FileSpreadsheet}>
									{preview.proposedEntries.length} ligne(s)
								</MetaField>
							</div>
						</div>
					</section>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<KpiCard
							label="Charges (classe 6)"
							value={String(preview.chargeLines.length)}
							icon={TrendingDown}
							tone="debit"
						/>
						<KpiCard
							label="Produits (classe 7)"
							value={String(preview.revenueLines.length)}
							icon={TrendingUp}
							tone="credit"
						/>
						<KpiCard
							label="Débit pro forma"
							value={formatAmount(entryTotals.debit, "XAF")}
							icon={ArrowUpRight}
							tone="neutral"
						/>
						<KpiCard
							label="Crédit pro forma"
							value={formatAmount(entryTotals.credit, "XAF")}
							icon={ArrowDownLeft}
							tone="neutral"
						/>
					</div>

					{preview.warnings.length > 0 ? (
						<OpsInlineAlert variant="warning">
							<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
							<div>
								<p className="font-semibold">Avertissements ({preview.warnings.length})</p>
								<ul className="mt-2 list-inside list-disc space-y-1 text-sm">
									{preview.warnings.map((warning, index) => (
										<li key={index}>{warning}</li>
									))}
								</ul>
							</div>
						</OpsInlineAlert>
					) : null}

					{preview.proposedEntries.length === 0 ? (
						<OpsInlineAlert variant="warning">
							<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
							<p>
								Aucune écriture pro forma — vérifiez que les comptes GL 121/122/131/132 sont configurés et
								actifs.
							</p>
						</OpsInlineAlert>
					) : null}

					<SectionCard
						title="Compte de résultat — soldes à clôturer"
						description="Comptes EXPENSE et REVENUE en XAF avec solde non nul au 31/12"
						icon={BookOpen}
					>
						<div className="mb-4 flex flex-wrap gap-2">
							{(
								[
									["charges", `Charges (${preview.chargeLines.length})`],
									["revenues", `Produits (${preview.revenueLines.length})`],
									["entries", `Écritures (${preview.proposedEntries.length})`]
								] as const
							).map(([tab, label]) => (
								<button
									key={tab}
									type="button"
									onClick={() => setActiveTab(tab)}
									className={cn(
										"rounded-ops-md px-3 py-1.5 text-sm font-medium transition-colors",
										activeTab === tab
											? "bg-violet-600 text-white"
											: "bg-ops-surface-muted text-ops-fg-muted hover:bg-ops-surface hover:text-ops-fg"
									)}
								>
									{label}
								</button>
							))}
						</div>

						{activeTab === "charges" ? (
							preview.chargeLines.length === 0 ? (
								<p className="text-sm text-ops-fg-muted">Aucune charge à solder pour cet exercice.</p>
							) : (
								<div className="overflow-x-auto rounded-ops-lg border border-ops-border">
									<table className="min-w-full divide-y divide-ops-border text-sm">
										<thead className="bg-ops-surface-muted/60">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
													Compte GL
												</th>
												<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
													PCEMF
												</th>
												<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
													Solde à solder
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-ops-border bg-white">
											{preview.chargeLines.map((line) => (
												<tr key={line.ledgerAccountId} className="hover:bg-ops-surface-muted/30">
													<td className="px-4 py-3 font-mono text-ops-fg">{line.ledgerAccountCode}</td>
													<td className="px-4 py-3 font-mono text-ops-fg-muted">{line.pcemfCode}</td>
													<td className="px-4 py-3 text-right text-red-700">
														<AmountCell amount={line.closingAmount} />
													</td>
												</tr>
											))}
										</tbody>
										<tfoot className="bg-ops-surface-muted/40">
											<tr>
												<td colSpan={2} className="px-4 py-3 text-right text-xs font-semibold uppercase text-ops-fg-muted">
													Total charges
												</td>
												<td className="px-4 py-3 text-right font-mono font-semibold text-red-800">
													{formatAmount(preview.totalCharges, "XAF")}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							)
						) : null}

						{activeTab === "revenues" ? (
							preview.revenueLines.length === 0 ? (
								<p className="text-sm text-ops-fg-muted">Aucun produit à solder pour cet exercice.</p>
							) : (
								<div className="overflow-x-auto rounded-ops-lg border border-ops-border">
									<table className="min-w-full divide-y divide-ops-border text-sm">
										<thead className="bg-ops-surface-muted/60">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
													Compte GL
												</th>
												<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
													PCEMF
												</th>
												<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
													Solde à solder
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-ops-border bg-white">
											{preview.revenueLines.map((line) => (
												<tr key={line.ledgerAccountId} className="hover:bg-ops-surface-muted/30">
													<td className="px-4 py-3 font-mono text-ops-fg">{line.ledgerAccountCode}</td>
													<td className="px-4 py-3 font-mono text-ops-fg-muted">{line.pcemfCode}</td>
													<td className="px-4 py-3 text-right text-emerald-700">
														<AmountCell amount={line.closingAmount} />
													</td>
												</tr>
											))}
										</tbody>
										<tfoot className="bg-ops-surface-muted/40">
											<tr>
												<td colSpan={2} className="px-4 py-3 text-right text-xs font-semibold uppercase text-ops-fg-muted">
													Total produits
												</td>
												<td className="px-4 py-3 text-right font-mono font-semibold text-emerald-800">
													{formatAmount(preview.totalRevenues, "XAF")}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							)
						) : null}

						{activeTab === "entries" ? (
							preview.proposedEntries.length === 0 ? (
								<p className="text-sm text-ops-fg-muted">Aucune écriture pro forma générée.</p>
							) : (
								<div className="space-y-4">
									<div className="flex flex-wrap items-center gap-3">
										<Badge
											className={cn(
												"border",
												entryTotals.balanced
													? "border-emerald-200 bg-emerald-100 text-emerald-900"
													: "border-red-200 bg-red-100 text-red-900"
											)}
										>
											{entryTotals.balanced ? (
												<span className="inline-flex items-center gap-1">
													<CheckCircle2 className="h-3.5 w-3.5" />
													Lot équilibré
												</span>
											) : (
												<span className="inline-flex items-center gap-1">
													<OctagonAlert className="h-3.5 w-3.5" />
													Déséquilibre détecté
												</span>
											)}
										</Badge>
										<span className="text-sm text-ops-fg-muted">
											Lot YEC-{preview.year}-001 · date {formatDateOnly(preview.asOfDate)}
										</span>
									</div>
									<div className="overflow-x-auto rounded-ops-lg border border-ops-border">
										<table className="min-w-full divide-y divide-ops-border text-sm">
											<thead className="bg-ops-surface-muted/60">
												<tr>
													<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
														Compte GL
													</th>
													<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
														PCEMF
													</th>
													<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
														Débit
													</th>
													<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
														Crédit
													</th>
													<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
														Libellé
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-ops-border bg-white">
												{preview.proposedEntries.map((entry, index) => (
													<tr key={`${entry.ledgerAccountCode}-${index}`} className="hover:bg-ops-surface-muted/30">
														<td className="whitespace-nowrap px-4 py-3 font-mono text-ops-fg">
															{entry.ledgerAccountCode}
														</td>
														<td className="whitespace-nowrap px-4 py-3 font-mono text-ops-fg-muted">
															{entry.pcemfCode}
														</td>
														<td className="whitespace-nowrap px-4 py-3 text-right">
															<AmountCell amount={entry.debitAmount} />
														</td>
														<td className="whitespace-nowrap px-4 py-3 text-right">
															<AmountCell amount={entry.creditAmount} />
														</td>
														<td className="px-4 py-3 text-ops-fg-muted">{entry.description}</td>
													</tr>
												))}
											</tbody>
											<tfoot className="bg-ops-surface-muted/40">
												<tr>
													<td colSpan={2} className="px-4 py-3 text-right text-xs font-semibold uppercase text-ops-fg-muted">
														Totaux
													</td>
													<td className="px-4 py-3 text-right font-mono font-semibold text-ops-fg">
														{formatAmount(entryTotals.debit, "XAF")}
													</td>
													<td className="px-4 py-3 text-right font-mono font-semibold text-ops-fg">
														{formatAmount(entryTotals.credit, "XAF")}
													</td>
													<td />
												</tr>
											</tfoot>
										</table>
									</div>
								</div>
							)
						) : null}
					</SectionCard>

					<SectionCard
						title="Prérequis et rappels"
						description="Contrôles attendus avant exécution définitive"
						icon={Scale}
					>
						<ul className="space-y-2 text-sm text-ops-fg-muted">
							<li className="flex gap-2">
								<Calendar className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
								Clôture journalière du 31/12/{preview.year} complétée
							</li>
							<li className="flex gap-2">
								<Calendar className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
								Clôture mensuelle de décembre {preview.year} complétée
							</li>
							<li className="flex gap-2">
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
								Comptes GL 121, 122, 131 et 132 actifs (report à nouveau et résultat)
							</li>
							<li className="flex gap-2">
								<Scale className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
								Formule : résultat net = produits − charges (devise XAF)
							</li>
						</ul>
					</SectionCard>
				</>
			) : null}
		</div>
	);
}
