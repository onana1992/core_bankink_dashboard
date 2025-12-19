"use client";

import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function FeesPage() {
	return (
		<TransactionListByType
			transactionType="FEE"
			title="Frais"
			description="Liste de tous les frais"
			newPagePath="/transactions/fee/new"
		/>
	);
}












