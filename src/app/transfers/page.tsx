"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { transfersApi, accountsApi, transactionsApi } from "@/lib/api";
import type { Transfer, TransferStatus, Account, Transaction } from "@/types";

const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
	PENDING: "bg-yellow-100 text-yellow-800",
	PROCESSING: "bg-blue-100 text-blue-800",
	COMPLETED: "bg-green-100 text-green-800",
	FAILED: "bg-red-100 text-red-800",
	CANCELLED: "bg-gray-100 text-gray-800"
};

const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
	PENDING: "En attente",
	PROCESSING: "En traitement",
	COMPLETED: "Terminé",
	FAILED: "Échoué",
	CANCELLED: "Annulé"
};

export default function TransfersPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transfers, setTransfers] = useState<Transfer[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	
	// Filtres
	const [fromAccountId, setFromAccountId] = useState<string>("");
	const [toAccountId, setToAccountId] = useState<string>("");
	const [status, setStatus] = useState<TransferStatus | "">("");
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	
	// Pagination
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	
	// Tri
	const [sortBy, setSortBy] = useState<"createdAt" | "amount" | "transferNumber">("createdAt");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

	async function loadAccounts() {
		try {
			const data = await accountsApi.list();
			setAccounts(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des comptes:", e);
		}
	}

	async function loadTransfers() {
		setLoading(true);
		setError(null);
		try {
			const params: any = {
				page,
				size
			};
			if (fromAccountId) params.fromAccountId = parseInt(fromAccountId);
			if (toAccountId) params.toAccountId = parseInt(toAccountId);
			if (status) params.status = status;
			if (fromDate) params.fromDate = fromDate;
			if (toDate) params.toDate = toDate;
			
			const response = await transfersApi.list(params);
			let sortedTransfers = [...(response.content || [])];
			
			// Tri côté client (en complément du tri backend)
			sortedTransfers.sort((a, b) => {
				let comparison = 0;
				if (sortBy === "createdAt") {
					comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				} else if (sortBy === "amount") {
					comparison = a.amount - b.amount;
				} else if (sortBy === "transferNumber") {
					comparison = a.transferNumber.localeCompare(b.transferNumber);
				}
				return sortDirection === "asc" ? comparison : -comparison;
			});
			
			setTransfers(sortedTransfers);
			setTotalPages(response.totalPages || 0);
			setTotalElements(response.totalElements || 0);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des transferts");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadAccounts();
	}, []);

	useEffect(() => {
		loadTransfers();
	}, [page, size, fromAccountId, toAccountId, status, fromDate, toDate, sortBy, sortDirection]);

	const stats = useMemo(() => {
		const total = totalElements;
		const by: Record<string, number> = {};
		let totalAmount = 0;
		transfers.forEach(transfer => {
			by[transfer.status] = (by[transfer.status] ?? 0) + 1;
			if (transfer.status === "COMPLETED") {
				totalAmount += Math.abs(transfer.amount);
			}
		});
		return {
			total,
			completed: by["COMPLETED"] ?? 0,
			pending: by["PENDING"] ?? 0,
			failed: by["FAILED"] ?? 0,
			processing: by["PROCESSING"] ?? 0,
			cancelled: by["CANCELLED"] ?? 0,
			totalAmount
		};
	}, [transfers, totalElements]);

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
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	function handleResetFilters() {
		setFromAccountId("");
		setToAccountId("");
		setStatus("");
		setFromDate("");
		setToDate("");
		setPage(0);
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Transferts Internes</h1>
					<p className="text-gray-600 mt-1">Gestion des virements entre comptes internes</p>
				</div>
				<Link href="/transfers/new">
					<Button className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Nouveau transfert
					</Button>
				</Link>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">Total</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">Terminés</div>
							<div className="text-3xl font-bold text-green-900">{stats.completed}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">En attente</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">En traitement</div>
							<div className="text-3xl font-bold text-blue-900">{stats.processing}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">Échoués</div>
							<div className="text-3xl font-bold text-red-900">{stats.failed}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-gray-700 mb-1">Annulés</div>
							<div className="text-3xl font-bold text-gray-900">{stats.cancelled}</div>
						</div>
						<div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Montant total */}
			{stats.completed > 0 && (
				<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-xl shadow-sm border border-indigo-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-indigo-700 mb-1">Montant total (terminés)</div>
							<div className="text-2xl font-bold text-indigo-900">
								{formatAmount(stats.totalAmount, transfers[0]?.currency || "XAF")}
							</div>
						</div>
						<div className="w-12 h-12 bg-indigo-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
			)}

			{/* Filtres */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Compte source</label>
						<select
							value={fromAccountId}
							onChange={(e) => { setFromAccountId(e.target.value); setPage(0); }}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">Tous</option>
							{accounts.map((acc) => (
								<option key={acc.id} value={acc.id}>
									{acc.accountNumber}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Compte destination</label>
						<select
							value={toAccountId}
							onChange={(e) => { setToAccountId(e.target.value); setPage(0); }}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">Tous</option>
							{accounts.map((acc) => (
								<option key={acc.id} value={acc.id}>
									{acc.accountNumber}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
						<select
							value={status}
							onChange={(e) => { setStatus(e.target.value as TransferStatus | ""); setPage(0); }}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">Tous</option>
							{Object.entries(TRANSFER_STATUS_LABELS).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
						<Input
							type="date"
							value={fromDate}
							onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
						<Input
							type="date"
							value={toDate}
							onChange={(e) => { setToDate(e.target.value); setPage(0); }}
						/>
					</div>
					<div className="flex items-end">
						<Button variant="outline" onClick={handleResetFilters} className="w-full">
							Réinitialiser
						</Button>
					</div>
				</div>
			</div>

			{/* Tableau */}
			{error ? (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			) : loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement...</p>
				</div>
			) : transfers.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">Aucun transfert trouvé</p>
					<p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres de recherche</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th 
										className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
										onClick={() => {
											if (sortBy === "transferNumber") {
												setSortDirection(sortDirection === "asc" ? "desc" : "asc");
											} else {
												setSortBy("transferNumber");
												setSortDirection("desc");
											}
										}}
									>
										<div className="flex items-center gap-2">
											Numéro
											{sortBy === "transferNumber" && (
												<svg className={`w-4 h-4 ${sortDirection === "desc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
												</svg>
											)}
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">De</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vers</th>
									<th 
										className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
										onClick={() => {
											if (sortBy === "amount") {
												setSortDirection(sortDirection === "asc" ? "desc" : "asc");
											} else {
												setSortBy("amount");
												setSortDirection("desc");
											}
										}}
									>
										<div className="flex items-center justify-end gap-2">
											Montant
											{sortBy === "amount" && (
												<svg className={`w-4 h-4 ${sortDirection === "desc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
												</svg>
											)}
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Frais</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
									<th 
										className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
										onClick={() => {
											if (sortBy === "createdAt") {
												setSortDirection(sortDirection === "asc" ? "desc" : "asc");
											} else {
												setSortBy("createdAt");
												setSortDirection("desc");
											}
										}}
									>
										<div className="flex items-center gap-2">
											Date
											{sortBy === "createdAt" && (
												<svg className={`w-4 h-4 ${sortDirection === "desc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
												</svg>
											)}
										</div>
									</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{transfers.map((transfer) => (
									<tr key={transfer.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/transfers/${transfer.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
											>
												{transfer.transferNumber}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/accounts/${transfer.fromAccountId}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
											>
												{accounts.find((a) => a.id === transfer.fromAccountId)?.accountNumber || transfer.fromAccountId}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/accounts/${transfer.toAccountId}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
											>
												{accounts.find((a) => a.id === transfer.toAccountId)?.accountNumber || transfer.toAccountId}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="font-mono font-semibold text-gray-900">
												{formatAmount(transfer.amount, transfer.currency)}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="font-mono text-gray-600">
												{transfer.feeAmount > 0 ? formatAmount(transfer.feeAmount, transfer.currency) : "-"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className={TRANSFER_STATUS_COLORS[transfer.status]}>
												{TRANSFER_STATUS_LABELS[transfer.status]}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{formatDate(transfer.createdAt)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/transfers/${transfer.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													Voir
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					
					{/* Pagination */}
					{totalElements > 0 && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
							<div className="flex items-center justify-between">
								<div className="text-sm text-gray-600">
									Affichage de <span className="font-semibold">{transfers.length}</span> sur <span className="font-semibold">{totalElements}</span> transfert{totalElements > 1 ? "s" : ""}
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage(page - 1)}
										disabled={page === 0}
										className="flex items-center gap-1"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
										</svg>
										Précédent
									</Button>
									<span className="flex items-center px-4 text-sm text-gray-700">
										Page {page + 1} sur {totalPages || 1}
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage(page + 1)}
										disabled={page >= totalPages - 1}
										className="flex items-center gap-1"
									>
										Suivant
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}




