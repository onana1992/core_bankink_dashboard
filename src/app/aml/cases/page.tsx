"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AmlCasesIndexPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [caseId, setCaseId] = useState("");

	function open() {
		const id = Number(caseId.trim());
		if (Number.isFinite(id) && id > 0) {
			router.push(`/aml/cases/${id}`);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">{t("aml.cases.indexTitle")}</h1>
				<p className="text-gray-600 mt-1">{t("aml.cases.indexSubtitle")}</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<div className="flex items-center gap-2">
						<div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
							<svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12m-12 5h12M3 7h.01M3 12h.01M3 17h.01" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">{t("aml.cases.caseId")}</h2>
					</div>
					<p className="text-sm text-gray-600">{t("aml.cases.open")}</p>
					<Input className="h-10 font-mono" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="ID" />
					<Button type="button" onClick={open} className="w-full sm:w-auto">
						{t("aml.cases.open")}
					</Button>
				</div>

				<div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
								<svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
							</div>
							<h2 className="text-lg font-semibold text-gray-900">{t("aml.cases.createNew")}</h2>
						</div>
						<p className="text-sm text-gray-600">{t("aml.cases.newSubtitle")}</p>
					</div>
					<Link href="/aml/cases/new" className="mt-6 inline-block">
						<Button type="button" className="w-full sm:w-auto">
							{t("aml.cases.createNew")}
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
