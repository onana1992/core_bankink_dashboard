"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { transactionsApi, accountsApi } from "@/lib/api";
import type { Transaction, TransactionType, TransactionStatus, Account } from "@/types";

const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
	PENDING: "bg-yellow-100 text-yellow-800",
	PROCESSING: "bg-blue-100 text-blue-800",
	COMPLETED: "bg-green-100 text-green-800",
	FAILED: "bg-red-100 text-red-800",
	REVERSED: "bg-gray-100 text-gray-800"
};

const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
	PENDING: "En attente",
	PROCESSING: "En traitement",
	COMPLETED: "Terminée",
	FAILED: "Échouée",
	REVERSED: "Annulée"
};

interface TransactionListByTypeProps {
	transactionType: TransactionType;
	title: string;
	description: string;
	newPagePath: string;
	icon?: React.ReactNode;
}

export default function TransactionListByType({
	transactionType,
	title,
	description,
	newPagePath,
	icon
}: TransactionListByTypeProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);

	useEffect(() => {
		async function load() {
			try {
				const data = await accountsApi.list();
				setAccounts(data);
			} catch (e: any) {
				console.error("Erreur lors du chargement des comptes:", e);
			}
		}
		load();
	}, []);

	useEffect(() => {
		async function loadTransactions() {
			setLoading(true);
			setError(null);
			try {
				const response = await transactionsApi.list({ type: transactionType, page, size });
				setTransactions(response.content || []);
				setTotalPages(response.totalPages || 0);
				setTotalElements(response.totalElements || 0);
			} catch (e: any) {
				setError(e?.message ?? `Erreur lors du chargement des ${title.toLowerCase()}`);
			} finally {
				setLoading(false);
			}
		}
		loadTransactions();
	}, [page, size, transactionType]);

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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link href="/transactions" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						Retour aux transactions
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">{title}</h1>
					<p className="text-gray-600 mt-1">{description}</p>
				</div>
				<Link href={newPagePath}>
					<Button className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Nouveau
					</Button>
				</Link>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement...</p>
				</div>
			) : transactions.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">Aucune transaction trouvée</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Numéro</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Compte</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Montant</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{transactions.map((txn) => (
									<tr key={txn.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/transactions/${txn.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
											>
												{txn.transactionNumber}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/accounts/${txn.accountId}`}
												className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
											>
												{accounts.find((a) => a.id === txn.accountId)?.accountNumber || txn.accountId}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="font-mono font-semibold text-gray-900">
												{formatAmount(txn.amount, txn.currency)}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className={TRANSACTION_STATUS_COLORS[txn.status]}>
												{TRANSACTION_STATUS_LABELS[txn.status]}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{formatDate(txn.transactionDate)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/transactions/${txn.id}`}>
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
					
					{totalElements > 0 && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
							<div className="flex items-center justify-between">
								<div className="text-sm text-gray-600">
									Affichage de <span className="font-semibold">{transactions.length}</span> sur <span className="font-semibold">{totalElements}</span> transaction{totalElements > 1 ? "s" : ""}
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

