"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { closuresApi } from "@/lib/api";
import type { Closure, ClosureType, ClosureStatus, CloseDayRequest, CloseMonthRequest } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

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
	IN_PROGRESS: "bg-yellow-100 text-yellow-800",
	COMPLETED: "bg-green-100 text-green-800",
	FAILED: "bg-red-100 text-red-800"
};

export default function ClosuresPage() {
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [closures, setClosures] = useState<Closure[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
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
			setClosures(response.content);
			setTotalPages(response.totalPages);
			setTotalElements(response.totalElements);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des clôtures");
		} finally {
			setLoading(false);
		}
	}

	async function handleCloseDay(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await closuresApi.closeDay(dayForm);
			setShowDayForm(false);
			setDayForm({
				date: new Date().toISOString().split("T")[0],
				description: ""
			});
			loadClosures();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la clôture journalière");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleCloseMonth(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await closuresApi.closeMonth(monthForm);
			setShowMonthForm(false);
			setMonthForm({
				year: new Date().getFullYear(),
				month: new Date().getMonth() + 1,
				description: ""
			});
			loadClosures();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la clôture mensuelle");
		} finally {
			setSubmitting(false);
		}
	}

	if (authLoading) {
		return <div className="p-6">Chargement...</div>;
	}

	if (!isAuthenticated) {
		router.push("/login");
		return null;
	}

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Gestion des Clôtures</h1>
				<div className="flex gap-2">
					<Button
						onClick={() => {
							setShowDayForm(true);
							setShowMonthForm(false);
						}}
						className="bg-blue-600 hover:bg-blue-700"
					>
						Clôture Journalière
					</Button>
					<Button
						onClick={() => {
							setShowMonthForm(true);
							setShowDayForm(false);
						}}
						className="bg-green-600 hover:bg-green-700"
					>
						Clôture Mensuelle
					</Button>
				</div>
			</div>

			{error && (
				<div className="mb-4 rounded bg-red-50 p-4 text-red-800">
					{error}
				</div>
			)}

			{/* Formulaire de clôture journalière */}
			{showDayForm && (
				<div className="mb-6 rounded-lg border bg-white p-6 shadow">
					<h2 className="mb-4 text-xl font-semibold">Clôture Journalière</h2>
					<form onSubmit={handleCloseDay} className="space-y-4">
						<Input
							label="Date"
							type="date"
							value={dayForm.date}
							onChange={(e) => setDayForm({ ...dayForm, date: e.target.value })}
							required
						/>
						<Input
							label="Description (optionnel)"
							value={dayForm.description || ""}
							onChange={(e) => setDayForm({ ...dayForm, description: e.target.value })}
						/>
						<div className="flex gap-2">
							<Button type="submit" disabled={submitting}>
								{submitting ? "Traitement..." : "Effectuer la clôture"}
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={() => setShowDayForm(false)}
							>
								Annuler
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Formulaire de clôture mensuelle */}
			{showMonthForm && (
				<div className="mb-6 rounded-lg border bg-white p-6 shadow">
					<h2 className="mb-4 text-xl font-semibold">Clôture Mensuelle</h2>
					<form onSubmit={handleCloseMonth} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<Input
								label="Année"
								type="number"
								min="2000"
								max="2100"
								value={monthForm.year}
								onChange={(e) => setMonthForm({ ...monthForm, year: parseInt(e.target.value) })}
								required
							/>
							<Input
								label="Mois"
								type="number"
								min="1"
								max="12"
								value={monthForm.month}
								onChange={(e) => setMonthForm({ ...monthForm, month: parseInt(e.target.value) })}
								required
							/>
						</div>
						<Input
							label="Description (optionnel)"
							value={monthForm.description || ""}
							onChange={(e) => setMonthForm({ ...monthForm, description: e.target.value })}
						/>
						<div className="flex gap-2">
							<Button type="submit" disabled={submitting}>
								{submitting ? "Traitement..." : "Effectuer la clôture"}
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={() => setShowMonthForm(false)}
							>
								Annuler
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Filtres */}
			<div className="mb-6 rounded-lg border bg-white p-4 shadow">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div>
						<label className="mb-1 block text-sm font-medium">Type</label>
						<select
							value={filterType}
							onChange={(e) => {
								setFilterType(e.target.value as ClosureType | "");
								setPage(0);
							}}
							className="w-full rounded border p-2"
						>
							<option value="">Tous</option>
							<option value="DAILY">Journalière</option>
							<option value="MONTHLY">Mensuelle</option>
							<option value="YEARLY">Annuelle</option>
						</select>
					</div>
					<div>
						<label className="mb-1 block text-sm font-medium">Statut</label>
						<select
							value={filterStatus}
							onChange={(e) => {
								setFilterStatus(e.target.value as ClosureStatus | "");
								setPage(0);
							}}
							className="w-full rounded border p-2"
						>
							<option value="">Tous</option>
							<option value="IN_PROGRESS">En cours</option>
							<option value="COMPLETED">Complétée</option>
							<option value="FAILED">Échouée</option>
						</select>
					</div>
					<div>
						<label className="mb-1 block text-sm font-medium">Date</label>
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
							variant="secondary"
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

			{/* Liste des clôtures */}
			<div className="rounded-lg border bg-white shadow">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-medium">ID</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Date</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Type</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Statut</th>
								<th className="px-4 py-3 text-right text-sm font-medium">Débit</th>
								<th className="px-4 py-3 text-right text-sm font-medium">Crédit</th>
								<th className="px-4 py-3 text-center text-sm font-medium">Équilibre</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{loading ? (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center">
										Chargement...
									</td>
								</tr>
							) : closures.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center text-gray-500">
										Aucune clôture trouvée
									</td>
								</tr>
							) : (
								closures.map((closure) => (
									<tr key={closure.id} className="hover:bg-gray-50">
										<td className="px-4 py-3">{closure.id}</td>
										<td className="px-4 py-3">{closure.closureDate}</td>
										<td className="px-4 py-3">{TYPE_LABELS[closure.closureType]}</td>
										<td className="px-4 py-3">
											<Badge className={STATUS_COLORS[closure.status]}>
												{STATUS_LABELS[closure.status]}
											</Badge>
										</td>
										<td className="px-4 py-3 text-right">
											{closure.totalDebit.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="px-4 py-3 text-right">
											{closure.totalCredit.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="px-4 py-3 text-center">
											{closure.balanceCheck ? (
												<span className="text-green-600">✓</span>
											) : (
												<span className="text-red-600">✗</span>
											)}
										</td>
										<td className="px-4 py-3">
											<Link
												href={`/closures/${closure.id}`}
												className="text-blue-600 hover:underline"
											>
												Détails
											</Link>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="border-t bg-gray-50 px-4 py-3">
						<div className="flex items-center justify-between">
							<div className="text-sm text-gray-700">
								Page {page + 1} sur {totalPages} ({totalElements} clôtures)
							</div>
							<div className="flex gap-2">
								<Button
									variant="secondary"
									onClick={() => setPage(Math.max(0, page - 1))}
									disabled={page === 0}
								>
									Précédent
								</Button>
								<Button
									variant="secondary"
									onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
									disabled={page >= totalPages - 1}
								>
									Suivant
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}


