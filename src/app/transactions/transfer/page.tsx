"use client";

import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function TransfersPage() {
	return (
		<TransactionListByType
			transactionType="TRANSFER"
			title="Virements"
			description="Liste de tous les virements"
			newPagePath="/transactions/transfer/new"
		/>
	);
}







