"use client";

import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function DepositsPage() {
	return (
		<TransactionListByType
			transactionType="DEPOSIT"
			title="Dépôts"
			description="Liste de tous les dépôts"
			newPagePath="/transactions/deposit/new"
		/>
	);
}








