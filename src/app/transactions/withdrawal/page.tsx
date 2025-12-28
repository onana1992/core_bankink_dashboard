"use client";

import { useTranslation } from "react-i18next";
import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function WithdrawalsPage() {
	const { t } = useTranslation();
	return (
		<TransactionListByType
			transactionType="WITHDRAWAL"
			title={t("transaction.list.types.withdrawals")}
			description={t("transaction.list.types.withdrawals")}
			newPagePath="/transactions/withdrawal/new"
		/>
	);
}















