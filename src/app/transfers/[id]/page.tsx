"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function TransferDetailPage() {
	const params = useParams();
	const router = useRouter();
	const transferId = params.id as string;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transfer, setTransfer] = useState<Transfer | null>(null);
	const [fromAccount, setFromAccount] = useState<Account | null>(null);
	const [toAccount, setToAccount] = useState<Account | null>(null);
	const [fromTransaction, setFromTransaction] = useState<Transaction | null>(null);
	const [toTransaction, setToTransaction] = useState<Transaction | null>(null);
	const [feeTransaction, setFeeTransaction] = useState<Transaction | null>(null);

	// Annulation
	const [showCancelModal, setShowCancelModal] = useState(false);
	const [cancelReason, setCancelReason] = useState("");
	const [cancelLoading, setCancelLoading] = useState(false);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const transferData = await transfersApi.get(transferId);
			setTransfer(transferData);

			// Charger les comptes
			try {
				const [fromAcc, toAcc] = await Promise.all([
					accountsApi.get(transferData.fromAccountId),
					accountsApi.get(transferData.toAccountId)
				]);
				setFromAccount(fromAcc);
				setToAccount(toAcc);
			} catch (e) {
				console.error("Erreur lors du chargement des comptes:", e);
			}

			// Charger les transactions associées
			const promises: Promise<any>[] = [];
			if (transferData.fromTransactionId) {
				promises.push(transactionsApi.get(transferData.fromTransactionId).then(setFromTransaction).catch(() => {}));
			}
			if (transferData.toTransactionId) {
				promises.push(transactionsApi.get(transferData.toTransactionId).then(setToTransaction).catch(() => {}));
			}
			if (transferData.feeTransactionId) {
				promises.push(transactionsApi.get(transferData.feeTransactionId).then(setFeeTransaction).catch(() => {}));
			}
			await Promise.all(promises);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement du transfert");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (transferId) {
			load();
		}
	}, [transferId]);

	async function handleCancel() {
		if (!cancelReason.trim()) {
			alert("La raison de l'annulation est requise");
			return;
		}
		setCancelLoading(true);
		try {
			await transfersApi.cancel(transferId, { reason: cancelReason });
			setShowCancelModal(false);
			setCancelReason("");
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de l'annulation du transfert");
		} finally {
			setCancelLoading(false);
		}
	}

	function formatAmount(amount: number, currency: string): string {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: currency || "XAF"
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
					<p className="text-gray-600">Chargement des informations du transfert...</p>
				</div>
			</div>
		);
	}

	if (error || !transfer) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">Erreur</div>
						<div className="text-sm mt-1">{error || "Transfert non trouvé"}</div>
					</div>
				</div>
				<Link href="/transfers">
					<Button className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						Retour à la liste
					</Button>
				</Link>
			</div>
		);
	}

	const canCancel = transfer.status === "PENDING";

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/transfers" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des transferts
				</Link>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Transfert {transfer.transferNumber}</h1>
							<p className="text-gray-600 mt-1">Détails du virement interne</p>
						</div>
					</div>
					{canCancel && (
						<Button
							variant="outline"
							onClick={() => setShowCancelModal(true)}
							className="flex items-center gap-2"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
							Annuler le transfert
						</Button>
					)}
				</div>
			</div>

			{/* Informations principales */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Carte Informations générales */}
				<div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-bold text-white">Informations générales</h2>
								<p className="text-xs text-blue-100">Détails du transfert</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-4">
						<div className="bg-white rounded-lg p-4 border border-blue-100">
							<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Numéro</dt>
							<dd className="font-mono font-bold text-lg text-gray-900 mt-1">{transfer.transferNumber}</dd>
						</div>
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">Statut</dt>
							<dd>
								<Badge className={TRANSFER_STATUS_COLORS[transfer.status]}>
									{TRANSFER_STATUS_LABELS[transfer.status]}
								</Badge>
							</dd>
						</div>
						<div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg p-4 border border-blue-200">
							<dt className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Montant</dt>
							<dd className="text-2xl font-bold text-blue-900">
								{formatAmount(transfer.amount, transfer.currency)}
							</dd>
						</div>
						{transfer.feeAmount > 0 && (
							<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
								<dt className="text-sm font-medium text-gray-700">Frais</dt>
								<dd className="text-sm font-semibold text-orange-600">
									{formatAmount(transfer.feeAmount, transfer.currency)}
								</dd>
							</div>
						)}
						{transfer.description && (
							<div className="bg-white rounded-lg p-4 border border-gray-200">
								<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</dt>
								<dd className="text-sm text-gray-700">{transfer.description}</dd>
							</div>
						)}
						{transfer.reference && (
							<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
								<dt className="text-sm font-medium text-gray-700">Référence</dt>
								<dd className="text-sm font-mono text-gray-600">{transfer.reference}</dd>
							</div>
						)}
					</div>
				</div>

				{/* Carte Comptes */}
				<div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-bold text-white">Comptes</h2>
								<p className="text-xs text-green-100">Source et destination</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-4">
						<div className="bg-white rounded-lg p-4 border border-gray-200">
							<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Compte source</dt>
							<dd className="mt-1">
								{fromAccount ? (
									<Link
										href={`/accounts/${fromAccount.id}`}
										className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-bold text-lg"
									>
										{fromAccount.accountNumber}
									</Link>
								) : (
									<span className="font-mono text-gray-600">{transfer.fromAccountId}</span>
								)}
							</dd>
							{fromAccount && (
								<div className="mt-2 text-sm text-gray-600">
									Solde: <span className="font-semibold">{formatAmount(fromAccount.balance, fromAccount.currency)}</span>
								</div>
							)}
						</div>
						<div className="flex justify-center">
							<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
							</svg>
						</div>
						<div className="bg-white rounded-lg p-4 border border-gray-200">
							<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Compte destination</dt>
							<dd className="mt-1">
								{toAccount ? (
									<Link
										href={`/accounts/${toAccount.id}`}
										className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-bold text-lg"
									>
										{toAccount.accountNumber}
									</Link>
								) : (
									<span className="font-mono text-gray-600">{transfer.toAccountId}</span>
								)}
							</dd>
							{toAccount && (
								<div className="mt-2 text-sm text-gray-600">
									Solde: <span className="font-semibold">{formatAmount(toAccount.balance, toAccount.currency)}</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Dates */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-bold text-gray-900">Dates</h2>
				</div>
				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="flex items-center justify-between py-3 border-b border-gray-200">
							<dt className="text-sm text-gray-600">Date de valeur</dt>
							<dd className="font-medium text-gray-900">{transfer.valueDate}</dd>
						</div>
						<div className="flex items-center justify-between py-3 border-b border-gray-200">
							<dt className="text-sm text-gray-600">Créé le</dt>
							<dd className="font-medium text-gray-900">{formatDate(transfer.createdAt)}</dd>
						</div>
						{transfer.executionDate && (
							<div className="flex items-center justify-between py-3 border-b border-gray-200">
								<dt className="text-sm text-gray-600">Exécuté le</dt>
								<dd className="font-medium text-gray-900">{formatDate(transfer.executionDate)}</dd>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Transactions associées */}
			{(fromTransaction || toTransaction || feeTransaction) && (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
						<h2 className="text-lg font-bold text-gray-900">Transactions associées</h2>
					</div>
					<div className="p-6">
						<div className="space-y-4">
							{fromTransaction && (
								<div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
									<div>
										<div className="text-sm font-medium text-gray-700">Transaction de débit</div>
										<Link
											href={`/transactions/${fromTransaction.id}`}
											className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
										>
											{fromTransaction.transactionNumber}
										</Link>
									</div>
									<div className="text-right">
										<div className="text-sm font-semibold text-red-700">
											{formatAmount(fromTransaction.amount, fromTransaction.currency)}
										</div>
										<div className="text-xs text-gray-500">{fromTransaction.status}</div>
									</div>
								</div>
							)}
							{toTransaction && (
								<div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
									<div>
										<div className="text-sm font-medium text-gray-700">Transaction de crédit</div>
										<Link
											href={`/transactions/${toTransaction.id}`}
											className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
										>
											{toTransaction.transactionNumber}
										</Link>
									</div>
									<div className="text-right">
										<div className="text-sm font-semibold text-green-700">
											{formatAmount(toTransaction.amount, toTransaction.currency)}
										</div>
										<div className="text-xs text-gray-500">{toTransaction.status}</div>
									</div>
								</div>
							)}
							{feeTransaction && (
								<div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
									<div>
										<div className="text-sm font-medium text-gray-700">Transaction de frais</div>
										<Link
											href={`/transactions/${feeTransaction.id}`}
											className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
										>
											{feeTransaction.transactionNumber}
										</Link>
									</div>
									<div className="text-right">
										<div className="text-sm font-semibold text-orange-700">
											{formatAmount(feeTransaction.amount, feeTransaction.currency)}
										</div>
										<div className="text-xs text-gray-500">{feeTransaction.status}</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Modal d'annulation */}
			{showCancelModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
						<h2 className="text-xl font-bold text-gray-900 mb-4">Annuler le transfert</h2>
						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Raison de l'annulation *
							</label>
							<textarea
								value={cancelReason}
								onChange={(e) => setCancelReason(e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								rows={4}
								placeholder="Expliquez la raison de l'annulation..."
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setShowCancelModal(false);
									setCancelReason("");
								}}
								disabled={cancelLoading}
							>
								Annuler
							</Button>
							<Button onClick={handleCancel} disabled={cancelLoading}>
								{cancelLoading ? "Traitement..." : "Confirmer l'annulation"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}




