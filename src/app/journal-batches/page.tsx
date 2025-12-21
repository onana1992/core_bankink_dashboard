"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { journalBatchesApi } from "@/lib/api";
import type { JournalBatch, JournalBatchStatus, CreateJournalBatchRequest } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

const STATUS_LABELS: Record<JournalBatchStatus, string> = {
	DRAFT: "Brouillon",
	POSTED: "Posté",
	CLOSED: "Clôturé"
};

const STATUS_COLORS: Record<JournalBatchStatus, string> = {
	DRAFT: "bg-yellow-100 text-yellow-800",
	POSTED: "bg-blue-100 text-blue-800",
	CLOSED: "bg-green-100 text-green-800"
};

export default function JournalBatchesPage() {
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [batches, setBatches] = useState<JournalBatch[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [filterStatus, setFilterStatus] = useState<JournalBatchStatus | "">("");
	const [filterStartDate, setFilterStartDate] = useState("");
	const [filterEndDate, setFilterEndDate] = useState("");
	const [form, setForm] = useState<CreateJournalBatchRequest>({
		batchNumber: "",
		batchDate: new Date().toISOString().split("T")[0],
		description: ""
	});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		// Ne charger les données que si l'utilisateur est authentifié et que le chargement est terminé
		if (authLoading) return;
		if (!isAuthenticated) return;
		
		loadBatches();
	}, [filterStatus, filterStartDate, filterEndDate, authLoading, isAuthenticated]);

	async function loadBatches() {
		setLoading(true);
		setError(null);
		try {
			const data = await journalBatchesApi.list({
				status: filterStatus || undefined,
				startDate: filterStartDate || undefined,
				endDate: filterEndDate || undefined
			});
			setBatches(data);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des lots de journalisation");
		} finally {
			setLoading(false);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await journalBatchesApi.create(form);
			setShowForm(false);
			setForm({
				batchNumber: "",
				batchDate: new Date().toISOString().split("T")[0],
				description: ""
			});
			loadBatches();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la création du lot");
		} finally {
			setSubmitting(false);
		}
	}

	async function handlePost(id: number) {
		if (!confirm("Êtes-vous sûr de vouloir poster ce lot ? Cette action valide l'équilibre et change le statut en POSTED.")) {
			return;
		}
		try {
			await journalBatchesApi.post(id);
			loadBatches();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors du posting du lot");
		}
	}

	async function handleClose(id: number) {
		if (!confirm("Êtes-vous sûr de vouloir clôturer ce lot ? Cette action est irréversible.")) {
			return;
		}
		try {
			await journalBatchesApi.close(id);
			loadBatches();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la clôture du lot");
		}
	}

	function formatAmount(amount: number, currency: string): string {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: currency || "XAF"
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric"
		});
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Lots de Journalisation</h1>
					<p className="text-gray-600 mt-1">Gestion des lots de journalisation comptable</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={loadBatches} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Actualiser
					</Button>
					<Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						{showForm ? "Annuler" : "Nouveau lot"}
					</Button>
				</div>
			</div>

			{/* Filtres */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value as JournalBatchStatus || "")}
						>
							<option value="">Tous les statuts</option>
							<option value="DRAFT">Brouillon</option>
							<option value="POSTED">Posté</option>
							<option value="CLOSED">Clôturé</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
						<Input
							type="date"
							value={filterStartDate}
							onChange={(e) => setFilterStartDate(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
						<Input
							type="date"
							value={filterEndDate}
							onChange={(e) => setFilterEndDate(e.target.value)}
						/>
					</div>
				</div>
			</div>

			{/* Formulaire de création */}
			{showForm && (
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Nouveau lot de journalisation</h3>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Numéro de lot *</label>
								<Input
									value={form.batchNumber}
									onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
									required
									placeholder="JRNL-2024-001"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Date du lot *</label>
								<Input
									type="date"
									value={form.batchDate}
									onChange={(e) => setForm({ ...form, batchDate: e.target.value })}
									required
								/>
							</div>
							<div className="col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={3}
									placeholder="Description du lot de journalisation..."
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-4">
							<Button type="button" variant="outline" onClick={() => setShowForm(false)}>
								Annuler
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting ? "Création..." : "Créer"}
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Erreur */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement des lots...</p>
				</div>
			) : batches.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">Aucun lot de journalisation trouvé</p>
					<p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres ou créez un nouveau lot</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Numéro</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Débit</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Crédit</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Devise</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{batches.map((batch) => (
									<tr key={batch.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/journal-batches/${batch.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
											>
												{batch.batchNumber}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{formatDate(batch.batchDate)}
										</td>
										<td className="px-6 py-4 text-gray-600">
											{batch.description || "—"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-900">
											{formatAmount(batch.totalDebit, batch.currency)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-900">
											{formatAmount(batch.totalCredit, batch.currency)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
												{batch.currency}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className={STATUS_COLORS[batch.status]}>
												{STATUS_LABELS[batch.status]}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<div className="flex items-center justify-end gap-2">
												<Link href={`/journal-batches/${batch.id}`}>
													<Button variant="outline" size="sm" className="flex items-center gap-1">
														<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
														</svg>
														Voir
													</Button>
												</Link>
												{batch.status === "DRAFT" && (
													<Button
														variant="outline"
														size="sm"
														onClick={() => handlePost(batch.id)}
														className="flex items-center gap-1"
													>
														Poster
													</Button>
												)}
												{batch.status === "POSTED" && (
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleClose(batch.id)}
														className="flex items-center gap-1"
													>
														Clôturer
													</Button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{batches.length > 0 && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								Affichage de <span className="font-semibold">{batches.length}</span> lot{batches.length > 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
