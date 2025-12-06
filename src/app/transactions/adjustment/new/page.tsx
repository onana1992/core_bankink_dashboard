"use client";

import TransactionForm from "@/components/transactions/TransactionForm";

export default function NewAdjustmentPage() {
	return (
		<TransactionForm
			transactionType="ADJUSTMENT"
			title="Nouvel ajustement"
			description="Effectuer un ajustement sur un compte"
			icon={
				<div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
					<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
			}
		/>
	);
}

