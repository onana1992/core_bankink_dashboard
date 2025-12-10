"use client";

import { useState } from "react";
import TransactionForm from "@/components/transactions/TransactionForm";
import Input from "@/components/ui/Input";
import { accountsApi } from "@/lib/api";
import type { Account, CreateTransactionRequest } from "@/types";
import { useEffect } from "react";

export default function NewTransferPage() {
	const [destinationAccountId, setDestinationAccountId] = useState<number>(0);
	const [destinationAccounts, setDestinationAccounts] = useState<Account[]>([]);
	const [destinationAccount, setDestinationAccount] = useState<Account | null>(null);

	useEffect(() => {
		async function loadAccounts() {
			try {
				const data = await accountsApi.list();
				setDestinationAccounts(data.filter((acc) => acc.status === "ACTIVE"));
			} catch (e) {
				console.error("Erreur lors du chargement des comptes:", e);
			}
		}
		loadAccounts();
	}, []);

	useEffect(() => {
		if (destinationAccountId) {
			const account = destinationAccounts.find(a => a.id === destinationAccountId);
			setDestinationAccount(account || null);
		} else {
			setDestinationAccount(null);
		}
	}, [destinationAccountId, destinationAccounts]);

	return (
		<TransactionForm
			transactionType="TRANSFER"
			title="Nouveau virement"
			description="Effectuer un virement entre deux comptes"
			icon={
				<div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
					<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
					</svg>
				</div>
			}
			additionalFields={
				<>
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Compte destinataire <span className="text-red-500">*</span>
						</label>
						<select
							value={destinationAccountId}
							onChange={(e) => setDestinationAccountId(parseInt(e.target.value))}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							required
						>
							<option value={0}>Sélectionner le compte destinataire</option>
							{destinationAccounts.map((acc) => (
								<option key={acc.id} value={acc.id}>
									{acc.accountNumber} - {acc.currency} (Solde: {acc.balance.toFixed(2)})
								</option>
							))}
						</select>
						{destinationAccount && (
							<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Compte:</span>
										<span className="ml-2 font-semibold text-gray-900">
											{destinationAccount.accountNumber}
										</span>
									</div>
									<div>
										<span className="text-gray-600">Solde:</span>
										<span className="ml-2 font-semibold text-green-700">
											{destinationAccount.balance.toFixed(2)} {destinationAccount.currency}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</>
			}
			onSubmit={async (data: CreateTransactionRequest) => {
				// Pour un virement, on utilise l'endpoint standard avec referenceType et referenceId
				const { transactionsApi } = await import("@/lib/api");
				const transaction = await transactionsApi.create({
					...data,
					referenceType: "TRANSFER",
					referenceId: destinationAccountId
				});
				window.location.href = `/transactions/${transaction.id}`;
			}}
		/>
	);
}




