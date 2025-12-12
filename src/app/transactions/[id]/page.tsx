"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { transactionsApi, accountsApi, transfersApi, customersApi } from "@/lib/api";
import type { Transaction, TransactionEntry, TransactionStatus, Account, Transfer, Customer } from "@/types";

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
	DEPOSIT: "Dépôt",
	WITHDRAWAL: "Retrait",
	TRANSFER: "Virement",
	FEE: "Frais",
	INTEREST: "Intérêts",
	ADJUSTMENT: "Ajustement",
	REVERSAL: "Réversal"
};

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

const ENTRY_TYPE_LABELS: Record<string, string> = {
	DEBIT: "Débit",
	CREDIT: "Crédit"
};

export default function TransactionDetailPage() {
	const params = useParams();
	const transactionId = params.id as string;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transaction, setTransaction] = useState<Transaction | null>(null);
	const [entries, setEntries] = useState<TransactionEntry[]>([]);
	const [account, setAccount] = useState<Account | null>(null);
	const [transfer, setTransfer] = useState<Transfer | null>(null);
	const [transferNotFound, setTransferNotFound] = useState(false);
	const [fromAccount, setFromAccount] = useState<Account | null>(null);
	const [toAccount, setToAccount] = useState<Account | null>(null);
	const [fromClient, setFromClient] = useState<Customer | null>(null);
	const [toClient, setToClient] = useState<Customer | null>(null);
	
	// Réversal
	const [showReverseModal, setShowReverseModal] = useState(false);
	const [reverseReason, setReverseReason] = useState("");
	const [reverseLoading, setReverseLoading] = useState(false);

	async function load() {
		setLoading(true);
		setError(null);
		setTransferNotFound(false);
		try {
			const [txnData, entriesData] = await Promise.all([
				transactionsApi.get(transactionId),
				transactionsApi.getEntries(transactionId)
			]);
			setTransaction(txnData);
			setEntries(entriesData);
			
			if (txnData.accountId) {
				try {
					const accountData = await accountsApi.get(txnData.accountId);
					setAccount(accountData);
				} catch (e) {
					console.error("Erreur lors du chargement du compte:", e);
				}
			}

			// Si c'est une transaction liée à un transfert, charger les informations du transfert
			if (txnData.referenceType === "TRANSFER" && txnData.referenceId) {
				try {
					const transferData = await transfersApi.get(txnData.referenceId);
					setTransfer(transferData);
					
					// Charger les comptes source et destination
					const [fromAccData, toAccData] = await Promise.all([
						accountsApi.get(transferData.fromAccountId).catch(() => null),
						accountsApi.get(transferData.toAccountId).catch(() => null)
					]);
					
					if (fromAccData) {
						setFromAccount(fromAccData);
						// Charger le client source
						try {
							const clientData = await customersApi.get(fromAccData.clientId);
							setFromClient(clientData);
						} catch (e) {
							console.error("Erreur lors du chargement du client source:", e);
						}
					}
					
					if (toAccData) {
						setToAccount(toAccData);
						// Charger le client destination
						try {
							const clientData = await customersApi.get(toAccData.clientId);
							setToClient(clientData);
						} catch (e) {
							console.error("Erreur lors du chargement du client destination:", e);
						}
					}
				} catch (e: any) {
					// Si le transfert n'est pas trouvé (404), c'est acceptable - la transaction peut exister sans le transfert
					// (par exemple si le transfert a été supprimé ou s'il y a une incohérence dans les données)
					if (e?.message?.includes("non trouvé") || e?.message?.includes("non trouvée")) {
						console.warn(`Transfert ${txnData.referenceId} non trouvé pour la transaction ${transactionId}. La transaction peut exister indépendamment du transfert.`);
						setTransferNotFound(true);
					} else {
						console.error("Erreur lors du chargement du transfert:", e);
					}
					// Ne pas définir le transfert si une erreur survient
					setTransfer(null);
				}
			}
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement de la transaction");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (transactionId) {
			load();
		}
	}, [transactionId]);

	async function handleReverse() {
		if (!reverseReason.trim()) {
			alert("La raison de l'annulation est requise");
			return;
		}
		setReverseLoading(true);
		try {
			await transactionsApi.reverse(transactionId, { reason: reverseReason });
			setShowReverseModal(false);
			setReverseReason("");
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de l'annulation de la transaction");
		} finally {
			setReverseLoading(false);
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
					<p className="text-gray-600">Chargement des informations de la transaction...</p>
				</div>
			</div>
		);
	}

	if (error || !transaction) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">Erreur</div>
						<div className="text-sm mt-1">{error || "Transaction non trouvée"}</div>
					</div>
				</div>
				<Link href="/transactions">
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

	const canReverse = transaction.status === "COMPLETED";

	return (
		<div className="space-y-6">
			{/* En-tête amélioré */}
			<div>
				<Link href="/transactions" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des transactions
				</Link>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Transaction {transaction.transactionNumber}</h1>
							<p className="text-gray-600 mt-1">Détails et écritures comptables</p>
						</div>
					</div>
					{canReverse && (
						<Button
							variant="outline"
							onClick={() => setShowReverseModal(true)}
							className="flex items-center gap-2"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
							Annuler la transaction
						</Button>
					)}
				</div>
			</div>

			{/* Informations principales */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Carte Informations générales */}
				<div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-bold text-white">Informations générales</h2>
								<p className="text-xs text-indigo-100">Détails de la transaction</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-4">
						<div className="bg-white rounded-lg p-4 border border-indigo-100">
							<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Numéro</dt>
							<dd className="font-mono font-bold text-lg text-gray-900 mt-1">{transaction.transactionNumber}</dd>
						</div>
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">Type</dt>
							<dd className="text-sm font-semibold text-gray-900">{TRANSACTION_TYPE_LABELS[transaction.type]}</dd>
						</div>
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">Statut</dt>
							<dd>
								<Badge className={TRANSACTION_STATUS_COLORS[transaction.status]}>
									{TRANSACTION_STATUS_LABELS[transaction.status]}
								</Badge>
							</dd>
						</div>
						<div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg p-4 border border-indigo-200">
							<dt className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-2">Montant</dt>
							<dd className="text-2xl font-bold text-indigo-900">
								{formatAmount(transaction.amount, transaction.currency)}
							</dd>
						</div>
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">Compte</dt>
							<dd className="text-sm">
								{account ? (
									<Link
										href={`/accounts/${account.id}`}
										className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
									>
										{account.accountNumber}
									</Link>
								) : (
									<span className="font-mono text-gray-600">{transaction.accountId}</span>
								)}
							</dd>
						</div>
						{transaction.description && (
							<div className="bg-white rounded-lg p-4 border border-gray-200">
								<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</dt>
								<dd className="text-sm text-gray-700">{transaction.description}</dd>
							</div>
						)}
						{transfer && (
							<div className="bg-white rounded-lg p-4 border border-blue-200">
								<dt className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Transfert interne</dt>
								<dd className="text-sm">
									<Link
										href={`/transfers/${transfer.id}`}
										className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
									>
										{transfer.transferNumber}
									</Link>
								</dd>
							</div>
						)}
					</div>
				</div>

				{/* Carte Dates */}
				<div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-bold text-white">Dates</h2>
								<p className="text-xs text-blue-100">Horodatage de la transaction</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-4">
						<div className="flex items-center justify-between py-3 border-b border-gray-200">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Date de transaction
							</dt>
							<dd className="font-medium text-gray-900">{formatDate(transaction.transactionDate)}</dd>
						</div>
						<div className="flex items-center justify-between py-3 border-b border-gray-200">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								Date de valeur
							</dt>
							<dd className="font-medium text-gray-900">{transaction.valueDate}</dd>
						</div>
						<div className="flex items-center justify-between py-3 border-b border-gray-200">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Créée le
							</dt>
							<dd className="font-medium text-gray-900">{formatDate(transaction.createdAt)}</dd>
						</div>
						<div className="flex items-center justify-between py-3">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Modifiée le
							</dt>
							<dd className="font-medium text-gray-900">{formatDate(transaction.updatedAt)}</dd>
						</div>
					</div>
				</div>
			</div>

			{/* Message si le transfert n'est pas trouvé */}
			{transferNotFound && transaction?.referenceType === "TRANSFER" && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-4">
						<div className="flex items-start gap-3">
							<svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<div className="flex-1">
								<h3 className="text-sm font-semibold text-yellow-900 mb-1">Transfert non trouvé</h3>
								<p className="text-sm text-yellow-700">
									Cette transaction référence un transfert (ID: {transaction.referenceId}) qui n'a pas pu être chargé. 
									La transaction peut exister indépendamment du transfert.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Informations émetteur/destinataire pour les transferts */}
			{transfer && (fromAccount || toAccount) && (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-bold text-gray-900">Informations du transfert</h2>
								<p className="text-xs text-gray-600">Émetteur et destinataire</p>
							</div>
						</div>
					</div>
					<div className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Émetteur */}
							<div className="bg-red-50 border border-red-200 rounded-lg p-4">
								<div className="flex items-center gap-2 mb-3">
									<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
									</svg>
									<h3 className="font-semibold text-red-900">Émetteur</h3>
								</div>
								{fromClient && (
									<div className="mb-3">
										<div className="text-xs text-gray-600 mb-1">Client</div>
										<div className="font-semibold text-gray-900">
											<Link
												href={`/customers/${fromClient.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline"
											>
												{fromClient.displayName}
											</Link>
										</div>
										{fromClient.email && (
											<div className="text-sm text-gray-600 mt-1">{fromClient.email}</div>
										)}
									</div>
								)}
								{fromAccount && (
									<div>
										<div className="text-xs text-gray-600 mb-1">Compte</div>
										<div className="font-mono font-semibold text-gray-900">
											<Link
												href={`/accounts/${fromAccount.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline"
											>
												{fromAccount.accountNumber}
											</Link>
										</div>
										<div className="text-sm text-gray-600 mt-1">
											Solde: {formatAmount(fromAccount.balance, fromAccount.currency)}
										</div>
									</div>
								)}
							</div>

							{/* Destinataire */}
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<div className="flex items-center gap-2 mb-3">
									<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
									<h3 className="font-semibold text-green-900">Destinataire</h3>
								</div>
								{toClient && (
									<div className="mb-3">
										<div className="text-xs text-gray-600 mb-1">Client</div>
										<div className="font-semibold text-gray-900">
											<Link
												href={`/customers/${toClient.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline"
											>
												{toClient.displayName}
											</Link>
										</div>
										{toClient.email && (
											<div className="text-sm text-gray-600 mt-1">{toClient.email}</div>
										)}
									</div>
								)}
								{toAccount && (
									<div>
										<div className="text-xs text-gray-600 mb-1">Compte</div>
										<div className="font-mono font-semibold text-gray-900">
											<Link
												href={`/accounts/${toAccount.id}`}
												className="text-blue-600 hover:text-blue-800 hover:underline"
											>
												{toAccount.accountNumber}
											</Link>
										</div>
										<div className="text-sm text-gray-600 mt-1">
											Solde: {formatAmount(toAccount.balance, toAccount.currency)}
										</div>
									</div>
								)}
							</div>
						</div>
						{transfer.feeAmount > 0 && (
							<div className="mt-4 pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between">
									<span className="text-sm text-gray-600">Frais de transfert:</span>
									<span className="font-semibold text-orange-600">
										{formatAmount(transfer.feeAmount, transfer.currency)}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Écritures comptables */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						</div>
						<div>
							<h2 className="text-lg font-bold text-gray-900">Écritures comptables</h2>
							<p className="text-xs text-gray-600">Double écriture (débit/crédit)</p>
						</div>
					</div>
				</div>
				{entries.length === 0 ? (
					<div className="p-12 text-center">
						<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<p className="text-gray-500 text-lg font-medium">Aucune écriture trouvée</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Montant</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Devise</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Compte GL</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{entries.map((entry) => (
									<tr key={entry.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge
												className={
													entry.entryType === "DEBIT"
														? "bg-red-100 text-red-800"
														: "bg-green-100 text-green-800"
												}
											>
												{ENTRY_TYPE_LABELS[entry.entryType]}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<span className="font-mono font-semibold text-gray-900">
												{formatAmount(entry.amount, entry.currency)}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
												{entry.currency}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{entry.ledgerAccountId ? (
												<span className="font-mono text-gray-600">{entry.ledgerAccountId}</span>
											) : (
												<span className="text-gray-400">—</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{formatDate(entry.createdAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Modal de réversal */}
			{showReverseModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
						<h2 className="text-xl font-bold text-gray-900 mb-4">Annuler la transaction</h2>
						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Raison de l'annulation *
							</label>
							<textarea
								value={reverseReason}
								onChange={(e) => setReverseReason(e.target.value)}
								className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								rows={4}
								placeholder="Expliquez la raison de l'annulation..."
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setShowReverseModal(false);
									setReverseReason("");
								}}
								disabled={reverseLoading}
							>
								Annuler
							</Button>
							<Button onClick={handleReverse} disabled={reverseLoading}>
								{reverseLoading ? "Traitement..." : "Confirmer l'annulation"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

