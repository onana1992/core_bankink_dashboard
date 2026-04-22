"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import { complianceApi, type VigilanceLastRun } from "@/lib/api";

export default function ComplianceVigilancePage() {
	const { t } = useTranslation();
	const [data, setData] = useState<VigilanceLastRun | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const r = await complianceApi.lastVigilanceRun();
			setData(r);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className="max-w-3xl mx-auto p-6 space-y-6">
			<div>
				<h1 className="text-2xl font-semibold text-gray-900">{t("complianceVigilancePage.title")}</h1>
				<p className="text-sm text-gray-600 mt-1">{t("complianceVigilancePage.subtitle")}</p>
			</div>
			<div className="flex gap-2">
				<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
					{t("complianceVigilancePage.refresh")}
				</Button>
			</div>
			{error && <p className="text-sm text-red-600">{t("complianceVigilancePage.loadError")} {error}</p>}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
				{loading ? (
					<p className="text-sm text-gray-500">{t("common.loading")}</p>
				) : !data?.at && data?.message === "NEVER" ? (
					<p className="text-sm text-gray-600">{t("complianceVigilancePage.never")}</p>
				) : (
					<>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">{t("complianceVigilancePage.lastAt")}</span>
							<span className="font-medium">{data?.at ? new Date(data.at).toISOString() : "—"}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">{t("complianceVigilancePage.processed")}</span>
							<span className="font-medium">{data?.clientsProcessed ?? 0}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">{t("complianceVigilancePage.updated")}</span>
							<span className="font-medium">{data?.profilesUpdated ?? 0}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">{t("complianceVigilancePage.message")}</span>
							<span className="font-medium">{data?.message ?? "—"}</span>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
