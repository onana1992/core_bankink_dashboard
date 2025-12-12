"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transfersApi, accountsApi, customersApi } from "@/lib/api";
import type { Transfer, Account, Customer } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function TransferDetailPage() {
	const params = useParams();
	const router = useRouter();
	const transferId = params.id as string;
	const [transfer, setTransfer] = useState<Transfer | null>(null);
	const [fromAccount, setFromAccount] = useState<Account | null>(null);
	const [toAccount, setToAccount] = useState<Account | null>(null);
	const [fromCustomer, setFromCustomer] = useState<Customer | null>(null);
	const [toCustomer, setToCustomer] = useState<Customer | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (transferId) {
			loadTransfer();
		}
	}, [transferId]);

	async function loadTransfer() {
		setLoading(true);
		setError(null);
		try {
			const data = await transfersApi.get(transferId);
			setTransfer(data);
			
			// Charger les comptes
			if (data.fromAccountId) {
				try {
					const account = await accountsApi.get(data.fromAccountId);
					setFromAccount(account);
					if (account.customerId) {
						try {
							const customer = await customersApi.get(account.customerId);
							setFromCustomer(customer);
						} catch (e) {
							console.error("Erreur lors du chargement du client source:", e);
						}
					}
				} catch (e) {
					console.error("Erreur lors du chargement du compte source:", e);
				}
			}
			
			if (data.toAccountId) {
				try {
					const account = await accountsApi.get(data.toAccountId);
					setToAccount(account);
					if (account.customerId) {
						try {
							const customer = await customersApi.get(account.customerId);
							setToCustomer(customer);
						} catch (e) {
							console.error("Erreur lors du chargement du client destination:", e);
						}
					}
				} catch (e) {
					console.error("Erreur lors du chargement du compte destination:", e);
				}
			}
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement du transfert");
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
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	if (loading && !transfer) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-64 bg-gray-200 rounded"></div>
				</div>
			</div>
		);
	}

	if (error && !transfer) {
		return (
			<div className="p-6">
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
					<Button onClick={() => router.push("/transfers")} className="mt-4">
						Retour à la liste
					</Button>
				</div>
			</div>
		);
	}

	if (!transfer) {
		return null;
	}

	return (
		<div className="p-6">
			<div className="mb-6">
				<Link href="/transfers" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
					← Retour à la liste des transferts
				</Link>
				<div className="flex items-center justify-between mt-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Détails du transfert</h1>
						<p className="text-gray-600 mt-1">Numéro: {transfer.transferNumber}</p>
					</div>
					{getStatusBadge(transfer.status)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Informations principales */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Informations principales</h2>
					<dl className="space-y-4">
						<div>
							<dt className="text-sm font-medium text-gray-500">Montant</dt>
							<dd className="mt-1 text-lg font-semibold text-gray-900">
								{formatCurrency(transfer.amount, transfer.currency)}
							</dd>
						</div>
						{transfer.feeAmount > 0 && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Frais</dt>
								<dd className="mt-1 text-sm text-gray-900">
									{formatCurrency(transfer.feeAmount, transfer.currency)}
								</dd>
							</div>
						)}
						<div>
							<dt className="text-sm font-medium text-gray-500">Devise</dt>
							<dd className="mt-1 text-sm text-gray-900">{transfer.currency}</dd>
						</div>
						{transfer.description && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Description</dt>
								<dd className="mt-1 text-sm text-gray-900">{transfer.description}</dd>
							</div>
						)}
						{transfer.reference && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Référence</dt>
								<dd className="mt-1 text-sm text-gray-900">{transfer.reference}</dd>
							</div>
						)}
						<div>
							<dt className="text-sm font-medium text-gray-500">Date de valeur</dt>
							<dd className="mt-1 text-sm text-gray-900">{formatDate(transfer.valueDate)}</dd>
						</div>
						{transfer.executionDate && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Date d'exécution</dt>
								<dd className="mt-1 text-sm text-gray-900">{formatDate(transfer.executionDate)}</dd>
							</div>
						)}
						<div>
							<dt className="text-sm font-medium text-gray-500">Créé le</dt>
							<dd className="mt-1 text-sm text-gray-900">{formatDate(transfer.createdAt)}</dd>
						</div>
					</dl>
				</div>

				{/* Compte source */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Compte source</h2>
					{fromAccount ? (
						<div className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-gray-500">Numéro de compte</dt>
								<dd className="mt-1">
									<Link href={`/accounts/${fromAccount.id}`} className="text-blue-600 hover:text-blue-800">
										{fromAccount.accountNumber}
									</Link>
								</dd>
							</div>
							{fromCustomer && (
								<div>
									<dt className="text-sm font-medium text-gray-500">Client</dt>
									<dd className="mt-1">
										<Link href={`/customers/${fromCustomer.id}`} className="text-blue-600 hover:text-blue-800">
											{fromCustomer.displayName}
										</Link>
									</dd>
								</div>
							)}
							<div>
								<dt className="text-sm font-medium text-gray-500">Solde</dt>
								<dd className="mt-1 text-sm text-gray-900">
									{formatCurrency(Number(fromAccount.balance), fromAccount.currency)}
								</dd>
							</div>
						</div>
					) : (
						<p className="text-gray-500">Chargement...</p>
					)}
				</div>

				{/* Compte destination */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Compte destination</h2>
					{toAccount ? (
						<div className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-gray-500">Numéro de compte</dt>
								<dd className="mt-1">
									<Link href={`/accounts/${toAccount.id}`} className="text-blue-600 hover:text-blue-800">
										{toAccount.accountNumber}
									</Link>
								</dd>
							</div>
							{toCustomer && (
								<div>
									<dt className="text-sm font-medium text-gray-500">Client</dt>
									<dd className="mt-1">
										<Link href={`/customers/${toCustomer.id}`} className="text-blue-600 hover:text-blue-800">
											{toCustomer.displayName}
										</Link>
									</dd>
								</div>
							)}
							<div>
								<dt className="text-sm font-medium text-gray-500">Solde</dt>
								<dd className="mt-1 text-sm text-gray-900">
									{formatCurrency(Number(toAccount.balance), toAccount.currency)}
								</dd>
							</div>
						</div>
					) : (
						<p className="text-gray-500">Chargement...</p>
					)}
				</div>

				{/* Transactions associées */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Transactions associées</h2>
					<div className="space-y-3">
						{transfer.fromTransactionId && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Transaction de débit</dt>
								<dd className="mt-1">
									<Link href={`/transactions/${transfer.fromTransactionId}`} className="text-blue-600 hover:text-blue-800">
										#{transfer.fromTransactionId}
									</Link>
								</dd>
							</div>
						)}
						{transfer.toTransactionId && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Transaction de crédit</dt>
								<dd className="mt-1">
									<Link href={`/transactions/${transfer.toTransactionId}`} className="text-blue-600 hover:text-blue-800">
										#{transfer.toTransactionId}
									</Link>
								</dd>
							</div>
						)}
						{transfer.feeTransactionId && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Transaction de frais</dt>
								<dd className="mt-1">
									<Link href={`/transactions/${transfer.feeTransactionId}`} className="text-blue-600 hover:text-blue-800">
										#{transfer.feeTransactionId}
									</Link>
								</dd>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
