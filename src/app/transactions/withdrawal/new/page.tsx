"use client";

import TransactionForm from "@/components/transactions/TransactionForm";
import type { TransactionType } from "@/types";

export default function NewWithdrawalPage() {
	return (
		<TransactionForm
			transactionType="WITHDRAWAL"
			title="Nouveau retrait"
			description="Effectuer un retrait depuis un compte"
			icon={
				<div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
					<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
					</svg>
				</div>
			}
		/>
	);
}



















