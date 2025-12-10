"use client";

import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function WithdrawalsPage() {
	return (
		<TransactionListByType
			transactionType="WITHDRAWAL"
			title="Retraits"
			description="Liste de tous les retraits"
			newPagePath="/transactions/withdrawal/new"
		/>
	);
}




