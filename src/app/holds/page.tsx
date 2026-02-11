"use client";

import { useTranslation } from "react-i18next";
import HoldListByAccount from "@/components/transactions/HoldListByAccount";

export default function HoldsPage() {
	const { t } = useTranslation();
	return (
		<HoldListByAccount
			title={t("hold.list.title")}
			description={t("hold.list.description")}
			newPagePath="/holds/new"
		/>
	);
}
