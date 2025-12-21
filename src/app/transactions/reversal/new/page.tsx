"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { transactionsApi, accountsApi, customersApi } from "@/lib/api";
import type { Transaction, Account, Customer, CreateTransactionRequest } from "@/types";

export default function NewReversalPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transactionId, setTransactionId] = useState<string>("");
	const [transaction, setTransaction] = useState<Transaction | null>(null);
	const [reason, setReason] = useState("");

	async function loadTransaction() {
		if (!transactionId) {
			setTransaction(null);
			return;
		}
		try {
			const txn = await transactionsApi.get(transactionId);
			setTransaction(txn);
			setError(null);
		} catch (e: any) {
			setTransaction(null);
			setError("Transaction non trouvée");
		}
	}

	useEffect(() => {
		const txnId = searchParams?.get("transactionId");
		if (txnId) {
			setTransactionId(txnId);
		}
	}, [searchParams]);

	useEffect(() => {
		if (transactionId) {
			loadTransaction();
		}
	}, [transactionId]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!transaction || !reason.trim()) {
			setError("Veuillez sélectionner une transaction et fournir une raison");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			await transactionsApi.reverse(transaction.id, { reason });
			router.push(`/transactions/${transaction.id}`);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la réversion de la transaction");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<Link href="/transactions" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des transactions
				</Link>
				<div className="flex items-center gap-4">
					<div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
						<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
						</svg>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Réversion de transaction</h1>
						<p className="text-gray-600 mt-1">Annuler une transaction existante</p>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">Erreur</div>
						<div className="text-sm mt-1">{error}</div>
					</div>
				</div>
			)}

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-4 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
							</svg>
						</div>
						<div>
							<h2 className="text-lg font-bold text-gray-900">Informations de réversion</h2>
							<p className="text-xs text-gray-600">Sélectionnez la transaction à inverser</p>
						</div>
					</div>
				</div>
				<form onSubmit={handleSubmit} className="p-6">
					<div className="space-y-6">
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">
								ID ou numéro de transaction <span className="text-red-500">*</span>
							</label>
							<div className="flex gap-2">
								<Input
									type="text"
									value={transactionId}
									onChange={(e) => setTransactionId(e.target.value)}
									placeholder="ID ou numéro de transaction"
									className="flex-1"
								/>
								<Button
									type="button"
									onClick={loadTransaction}
									disabled={!transactionId}
								>
									Rechercher
								</Button>
							</div>
						</div>

						{transaction && (
							<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Numéro:</span>
										<span className="ml-2 font-semibold text-gray-900">{transaction.transactionNumber}</span>
									</div>
									<div>
										<span className="text-gray-600">Type:</span>
										<span className="ml-2 font-semibold text-gray-900">{transaction.type}</span>
									</div>
									<div>
										<span className="text-gray-600">Montant:</span>
										<span className="ml-2 font-semibold text-gray-900">
											{transaction.amount.toFixed(2)} {transaction.currency}
										</span>
									</div>
									<div>
										<span className="text-gray-600">Statut:</span>
										<span className="ml-2 font-semibold text-gray-900">{transaction.status}</span>
									</div>
								</div>
							</div>
						)}

						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">
								Raison de la réversion <span className="text-red-500">*</span>
							</label>
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								rows={4}
								placeholder="Expliquez la raison de cette réversion..."
								required
							/>
						</div>

						<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
							<Link href="/transactions">
								<Button type="button" variant="outline">
									Annuler
								</Button>
							</Link>
							<Button 
								type="submit" 
								disabled={loading || !transaction || !reason.trim()}
								className="flex items-center gap-2"
							>
								{loading ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Réversion en cours...
									</>
								) : (
									<>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
										</svg>
										Réverser la transaction
									</>
								)}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}














