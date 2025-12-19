"use client";

import TransactionForm from "@/components/transactions/TransactionForm";
import type { TransactionType } from "@/types";

export default function NewDepositPage() {
	return (
		<TransactionForm
			transactionType="DEPOSIT"
			title="Nouveau dépôt"
			description="Créer un dépôt sur un compte"
			icon={
				<div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
					<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
				</div>
			}
		/>
	);
}












