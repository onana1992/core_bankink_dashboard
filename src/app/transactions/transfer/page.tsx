"use client";

import { useTranslation } from "react-i18next";
import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function TransfersPage() {
	const { t } = useTranslation();
	return (
		<TransactionListByType
			transactionType="TRANSFER"
			title={t("transaction.list.types.transfers")}
			description={t("transaction.list.types.transfers")}
			newPagePath="/transactions/transfer/new"
		/>
	);
}















