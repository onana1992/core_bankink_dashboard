"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transfersApi } from "@/lib/api";
import type { Transfer } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function TransfersPage() {
	const router = useRouter();
	const [transfers, setTransfers] = useState<Transfer[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const size = 20;

	useEffect(() => {
		loadTransfers();
	}, [page]);

	async function loadTransfers() {
		setLoading(true);
		setError(null);
		try {
			const response = await transfersApi.list({ page, size });
			setTransfers(response.content);
			setTotalPages(response.totalPages);
			setTotalElements(response.totalElements);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des transferts");
		} finally {
			setLoading(false);
		}
	}

	function getStatusBadge(status: Transfer["status"]) {
		const colors: Record<Transfer["status"], string> = {
			PENDING: "bg-yellow-100 text-yellow-800",
			PROCESSING: "bg-blue-100 text-blue-800",
			COMPLETED: "bg-green-100 text-green-800",
			FAILED: "bg-red-100 text-red-800",
			CANCELLED: "bg-gray-100 text-gray-800"
		};
		
		const labels: Record<Transfer["status"], string> = {
			PENDING: "En attente",
			PROCESSING: "En traitement",
			COMPLETED: "Complété",
			FAILED: "Échoué",
			CANCELLED: "Annulé"
		};

		return (
			<Badge className={colors[status]}>
				{labels[status]}
			</Badge>
		);
	}

	function formatCurrency(amount: number, currency: string) {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: currency || "XAF"
		}).format(amount);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString("fr-FR", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Transferts</h1>
					<p className="text-gray-600 mt-1">Liste de tous les transferts internes</p>
				</div>
				<Button onClick={() => router.push("/transfers/new")}>
					Nouveau transfert
				</Button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{loading ? (
				<div className="animate-pulse">
					<div className="h-64 bg-gray-200 rounded"></div>
				</div>
			) : (
				<>
					<div className="bg-white rounded-lg shadow overflow-hidden">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Numéro
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Compte source
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Compte destination
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Montant
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Statut
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Date
									</th>
									<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{transfers.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-6 py-4 text-center text-gray-500">
											Aucun transfert trouvé
										</td>
									</tr>
								) : (
									transfers.map((transfer) => (
										<tr key={transfer.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{transfer.transferNumber}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<Link href={`/accounts/${transfer.fromAccountId}`} className="text-blue-600 hover:text-blue-800">
													#{transfer.fromAccountId}
												</Link>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												<Link href={`/accounts/${transfer.toAccountId}`} className="text-blue-600 hover:text-blue-800">
													#{transfer.toAccountId}
												</Link>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
												{formatCurrency(transfer.amount, transfer.currency)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{getStatusBadge(transfer.status)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{formatDate(transfer.valueDate)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
												<Link
													href={`/transfers/${transfer.id}`}
													className="text-blue-600 hover:text-blue-900"
												>
													Voir
												</Link>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="mt-6 flex items-center justify-between">
							<div className="text-sm text-gray-700">
								Affichage de {page * size + 1} à {Math.min((page + 1) * size, totalElements)} sur {totalElements} transferts
							</div>
							<div className="flex gap-2">
								<Button
									onClick={() => setPage(p => Math.max(0, p - 1))}
									disabled={page === 0}
									className="px-4 py-2"
								>
									Précédent
								</Button>
								<Button
									onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
									disabled={page >= totalPages - 1}
									className="px-4 py-2"
								>
									Suivant
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
