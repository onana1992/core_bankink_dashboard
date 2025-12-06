"use client";

import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function AdjustmentsPage() {
	return (
		<TransactionListByType
			transactionType="ADJUSTMENT"
			title="Ajustements"
			description="Liste de tous les ajustements"
			newPagePath="/transactions/adjustment/new"
		/>
	);
}

