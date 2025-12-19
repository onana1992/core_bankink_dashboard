"use client";

import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function InterestPage() {
	return (
		<TransactionListByType
			transactionType="INTEREST"
			title="Intérêts"
			description="Liste de tous les intérêts"
			newPagePath="/transactions/interest/new"
		/>
	);
}












