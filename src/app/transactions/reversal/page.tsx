"use client";

import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function ReversalsPage() {
	return (
		<TransactionListByType
			transactionType="REVERSAL"
			title="Réversions"
			description="Liste de toutes les réversions"
			newPagePath="/transactions/reversal/new"
		/>
	);
}







