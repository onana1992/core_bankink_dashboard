"use client";

import TransactionForm from "@/components/transactions/TransactionForm";

export default function NewInterestPage() {
	return (
		<TransactionForm
			transactionType="INTEREST"
			title="Nouveaux intérêts"
			description="Enregistrer des intérêts sur un compte"
			icon={
				<div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
					<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				</div>
			}
		/>
	);
}



















