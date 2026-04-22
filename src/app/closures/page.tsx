"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	CalendarCheck,
	CalendarClock,
	CheckCircle2,
	Filter,
	Loader2,
	OctagonAlert,
	PlayCircle,
	XCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { closuresApi } from "@/lib/api";
import type { Closure, ClosureType, ClosureStatus, CloseDayRequest, CloseMonthRequest } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import TablePagination from "@/components/ui/TablePagination";

const TYPE_LABELS: Record<ClosureType, string> = {
	DAILY: "Journalière",
	MONTHLY: "Mensuelle",
	YEARLY: "Annuelle"
};

const STATUS_LABELS: Record<ClosureStatus, string> = {
	IN_PROGRESS: "En cours",
	COMPLETED: "Complétée",
	FAILED: "Échouée"
};

const STATUS_COLORS: Record<ClosureStatus, string> = {
	IN_PROGRESS: "bg-amber-100 text-amber-900 border-amber-200",
	COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-200",
	FAILED: "bg-red-100 text-red-900 border-red-200"
};

const selectClass =
	"w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white";

export default function ClosuresPage() {
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [closures, setClosures] = useState<Closure[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [showDayForm, setShowDayForm] = useState(false);
	const [showMonthForm, setShowMonthForm] = useState(false);
	const [filterType, setFilterType] = useState<ClosureType | "">("");
	const [filterStatus, setFilterStatus] = useState<ClosureStatus | "">("");
	const [filterDate, setFilterDate] = useState("");
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [dayForm, setDayForm] = useState<CloseDayRequest>({
		date: new Date().toISOString().split("T")[0],
		description: ""
	});
	const [monthForm, setMonthForm] = useState<CloseMonthRequest>({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
		description: ""
	});
	const [submitting, setSubmitting] = useState(false);

	const pageStats = useMemo(() => {
		let completed = 0;
		let failed = 0;
		let inProgress = 0;
		for (const c of closures) {
			if (c.status === "COMPLETED") completed++;
			else if (c.status === "FAILED") failed++;
			else if (c.status === "IN_PROGRESS") inProgress++;
		}
		return { completed, failed, inProgress };
	}, [closures]);

	useEffect(() => {
		if (authLoading) return;
		if (!isAuthenticated) return;
		loadClosures();
	}, [filterType, filterStatus, filterDate, page, size, authLoading, isAuthenticated]);

	async function loadClosures() {
		setLoading(true);
		setError(null);
		try {
			const response = await closuresApi.getClosures(
				filterType || undefined,
				filterStatus || undefined,
				filterDate || undefined,
				page,
				size
			);
			setClosures(response.content ?? []);
			setTotalPages(response.totalPages ?? 0);
			setTotalElements(response.totalElements ?? 0);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Erreur lors du chargement des clôtures";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	async function handleCloseDay(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		setSuccess(null);
		try {
			await closuresApi.closeDay(dayForm);
			setSuccess("Clôture journalière effectuée avec succès.");
			setShowDayForm(false);
			setDayForm({
				date: new Date().toISOString().split("T")[0],
				description: ""
			});
			loadClosures();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Erreur lors de la clôture journalière";
			setError(msg);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleCloseMonth(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		setSuccess(null);
		try {
			await closuresApi.closeMonth(monthForm);
			setSuccess("Clôture mensuelle effectuée avec succès.");
			setShowMonthForm(false);
			setMonthForm({
				year: new Date().getFullYear(),
				month: new Date().getMonth() + 1,
				description: ""
			});
			loadClosures();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Erreur lors de la clôture mensuelle";
			setError(msg);
		} finally {
			setSubmitting(false);
		}
	}

	if (authLoading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
			</div>
		);
	}

	if (!isAuthenticated) {
		router.push("/login");
		return null;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Clôtures comptables</h1>
					<p className="mt-1 text-gray-600">
						Clôture journalière et mensuelle, contrôle d&apos;équilibre GL et historique des exécutions.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button
						variant={showDayForm ? "secondary" : "default"}
						className="flex items-center gap-2"
						onClick={() => {
							setShowDayForm(!showDayForm);
							setShowMonthForm(false);
							setSuccess(null);
						}}
					>
						<CalendarClock className="h-4 w-4" />
						Clôture journalière
					</Button>
					<Button
						variant={showMonthForm ? "secondary" : "default"}
						className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
						onClick={() => {
							setShowMonthForm(!showMonthForm);
							setShowDayForm(false);
							setSuccess(null);
						}}
					>
						<CalendarCheck className="h-4 w-4" />
						Clôture mensuelle
					</Button>
				</div>
			</div>

			{success && (
				<div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
					<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
					<p className="text-sm font-medium">{success}</p>
				</div>
			)}

			{error && (
				<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
					<OctagonAlert className="mt-0.5 h-5 w-5 shrink-0" />
					<p className="text-sm">{error}</p>
				</div>
			)}

			{showDayForm && (
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="mb-4 flex items-center gap-2">
						<PlayCircle className="h-5 w-5 text-blue-600" />
						<h2 className="text-lg font-semibold text-gray-900">Nouvelle clôture journalière</h2>
					</div>
					<p className="mb-4 text-sm text-gray-600">
						Vérifie les transactions en attente, enregistre les totaux du jour, crée les snapshots GL et contrôle
						l&apos;équilibre du grand livre.
					</p>
					<form onSubmit={handleCloseDay} className="space-y-4">
						<Input
							label="Date de clôture"
							type="date"
							value={dayForm.date}
							onChange={(e) => setDayForm({ ...dayForm, date: e.target.value })}
							required
						/>
						<Input
							label="Commentaire (optionnel)"
							value={dayForm.description || ""}
							onChange={(e) => setDayForm({ ...dayForm, description: e.target.value })}
							placeholder="Ex. Fin de journée caisse centrale"
						/>
						<div className="flex flex-wrap gap-2">
							<Button type="submit" disabled={submitting} className="flex items-center gap-2">
								{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
								{submitting ? "Traitement…" : "Lancer la clôture"}
							</Button>
							<Button type="button" variant="outline" onClick={() => setShowDayForm(false)}>
								Annuler
							</Button>
						</div>
					</form>
				</div>
			)}

			{showMonthForm && (
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<div className="mb-4 flex items-center gap-2">
						<CalendarCheck className="h-5 w-5 text-emerald-600" />
						<h2 className="text-lg font-semibold text-gray-900">Nouvelle clôture mensuelle</h2>
					</div>
					<p className="mb-4 text-sm text-gray-600">
						Exige une clôture journalière complétée pour le dernier jour du mois. Applique intérêts et frais
						mensuels, puis valide l&apos;ensemble des contrôles.
					</p>
					<form onSubmit={handleCloseMonth} className="space-y-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Input
								label="Année"
								type="number"
								min={2000}
								max={2100}
								value={monthForm.year}
								onChange={(e) => setMonthForm({ ...monthForm, year: parseInt(e.target.value, 10) })}
								required
							/>
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700">Mois</label>
								<select
									className={selectClass}
									value={monthForm.month}
									onChange={(e) =>
										setMonthForm({ ...monthForm, month: parseInt(e.target.value, 10) })
									}
								>
									{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
										<option key={m} value={m}>
											{new Date(2000, m - 1).toLocaleString("fr-FR", { month: "long" })}
										</option>
									))}
								</select>
							</div>
						</div>
						<Input
							label="Commentaire (optionnel)"
							value={monthForm.description || ""}
							onChange={(e) => setMonthForm({ ...monthForm, description: e.target.value })}
							placeholder="Ex. Clôture août — revue conformité"
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								type="submit"
								disabled={submitting}
								className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
							>
								{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
								{submitting ? "Traitement…" : "Lancer la clôture mensuelle"}
							</Button>
							<Button type="button" variant="outline" onClick={() => setShowMonthForm(false)}>
								Annuler
							</Button>
						</div>
					</form>
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<div className="mb-1 text-sm font-medium text-blue-800">Total (filtres)</div>
							<div className="text-3xl font-bold text-blue-950">{totalElements}</div>
							<p className="mt-1 text-xs text-blue-800/80">Résultats correspondant aux critères</p>
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-200/80">
							<CalendarCheck className="h-6 w-6 text-blue-800" />
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<div className="mb-1 text-sm font-medium text-emerald-800">Complétées</div>
							<div className="text-3xl font-bold text-emerald-950">{pageStats.completed}</div>
							<p className="mt-1 text-xs text-emerald-800/80">Sur la page affichée</p>
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-200/80">
							<CheckCircle2 className="h-6 w-6 text-emerald-800" />
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<div className="mb-1 text-sm font-medium text-red-800">Échouées</div>
							<div className="text-3xl font-bold text-red-950">{pageStats.failed}</div>
							<p className="mt-1 text-xs text-red-800/80">Sur la page affichée</p>
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-200/80">
							<XCircle className="h-6 w-6 text-red-800" />
						</div>
					</div>
				</div>
				<div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<div className="mb-1 text-sm font-medium text-amber-900">En cours</div>
							<div className="text-3xl font-bold text-amber-950">{pageStats.inProgress}</div>
							<p className="mt-1 text-xs text-amber-900/80">Sur la page affichée</p>
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-200/80">
							<Loader2 className="h-6 w-6 text-amber-800" />
						</div>
					</div>
				</div>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<Filter className="h-5 w-5 text-gray-500" />
					<h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
						<select
							value={filterType}
							onChange={(e) => {
								setFilterType(e.target.value as ClosureType | "");
								setPage(0);
							}}
							className={selectClass}
						>
							<option value="">Tous les types</option>
							<option value="DAILY">Journalière</option>
							<option value="MONTHLY">Mensuelle</option>
							<option value="YEARLY">Annuelle</option>
						</select>
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">Statut</label>
						<select
							value={filterStatus}
							onChange={(e) => {
								setFilterStatus(e.target.value as ClosureStatus | "");
								setPage(0);
							}}
							className={selectClass}
						>
							<option value="">Tous les statuts</option>
							<option value="IN_PROGRESS">En cours</option>
							<option value="COMPLETED">Complétée</option>
							<option value="FAILED">Échouée</option>
						</select>
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">Date de clôture</label>
						<Input
							type="date"
							value={filterDate}
							onChange={(e) => {
								setFilterDate(e.target.value);
								setPage(0);
							}}
						/>
					</div>
					<div className="flex items-end">
						<Button
							variant="outline"
							className="w-full"
							onClick={() => {
								setFilterType("");
								setFilterStatus("");
								setFilterDate("");
								setPage(0);
							}}
						>
							Réinitialiser
						</Button>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
					<p className="mt-4 text-gray-600">Chargement des clôtures…</p>
				</div>
			) : closures.length === 0 ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<CalendarCheck className="mx-auto mb-4 h-16 w-16 text-gray-300" />
					<p className="text-lg font-medium text-gray-600">Aucune clôture trouvée</p>
					<p className="mt-2 text-sm text-gray-500">Modifiez les filtres ou lancez une clôture.</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										ID
									</th>
									<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										Date
									</th>
									<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										Type
									</th>
									<th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										Statut
									</th>
									<th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										Débit
									</th>
									<th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										Crédit
									</th>
									<th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
										Équilibre
									</th>
									<th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white text-sm">
								{closures.map((closure) => (
									<tr key={closure.id} className="transition-colors hover:bg-gray-50">
										<td className="whitespace-nowrap px-6 py-4 font-mono text-gray-900">{closure.id}</td>
										<td className="whitespace-nowrap px-6 py-4 text-gray-900">{closure.closureDate}</td>
										<td className="whitespace-nowrap px-6 py-4 text-gray-700">
											{TYPE_LABELS[closure.closureType]}
										</td>
										<td className="whitespace-nowrap px-6 py-4">
											<Badge className={`border ${STATUS_COLORS[closure.status]}`}>
												{STATUS_LABELS[closure.status]}
											</Badge>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right font-mono font-medium text-gray-900">
											{closure.totalDebit.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right font-mono font-medium text-gray-900">
											{closure.totalCredit.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-center">
											{closure.balanceCheck ? (
												<span className="inline-flex items-center gap-1 text-emerald-600" title="OK">
													<CheckCircle2 className="h-5 w-5" />
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-red-600" title="Échec">
													<XCircle className="h-5 w-5" />
												</span>
											)}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right">
											<Link href={`/closures/${closure.id}`}>
												<Button variant="outline" size="sm">
													Détails
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<TablePagination
						page={page}
						totalPages={totalPages}
						totalElements={totalElements}
						pageSize={size}
						onPageChange={setPage}
						resultsLabel={totalElements > 1 ? "clôtures" : "clôture"}
						showFirstLast
						sizeOptions={[10, 20, 50, 100]}
						size={size}
						onSizeChange={(s) => {
							setSize(s);
							setPage(0);
						}}
					/>
				</div>
			)}
		</div>
	);
}
