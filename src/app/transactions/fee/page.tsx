"use client";

import { useTranslation } from "react-i18next";
import TransactionListByType from "@/components/transactions/TransactionListByType";

export default function FeesPage() {
	const { t } = useTranslation();
	return (
		<TransactionListByType
			transactionType="FEE"
			title={t("transaction.list.types.fees")}
			description={t("transaction.list.types.fees")}
			newPagePath="/transactions/fee/new"
		/>
	);
}















