"use client";

import { useTranslation } from "react-i18next";
import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function DepositsPage() {
	const { t } = useTranslation();
	return (
		<TransactionListByType
			transactionType="DEPOSIT"
			title={t("transaction.list.types.deposits")}
			description={t("transaction.list.types.deposits")}
			newPagePath="/transactions/deposit/new"
		/>
	);
}















