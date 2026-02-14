"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loansApi } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import type { LoanSimulationResult } from "@/types";

export default function LoanSimulatePage() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const [principal, setPrincipal] = useState<string>("10000");
	const [annualRate, setAnnualRate] = useState<string>("8");
	const [months, setMonths] = useState<string>("36");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<LoanSimulationResult | null>(null);

	async function runSimulation(e: React.FormEvent) {
		e.preventDefault();
		const p = Number(principal);
		const r = Number(annualRate);
		const m = Number(months);
		if (!p || p <= 0 || m <= 0) {
			setError(t("loan.simulate.errorInvalid"));
			return;
		}
		setLoading(true);
		setError(null);
		setResult(null);
		try {
			const res = await loansApi.simulate(p, r, m);
			setResult(res);
		} catch (e: any) {
			setError(e?.message ?? t("loan.simulate.errorGeneric"));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/loans" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("loan.backToList")}
				</Link>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{t("sidebar.loanSimulation")}</h1>
						<p className="text-gray-600 mt-1">{t("loan.simulate.subtitle")}</p>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			<form onSubmit={runSimulation} className="space-y-6">
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">{t("loan.simulate.paramsTitle")}</h2>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label htmlFor="simulate-principal" className="block text-sm font-medium text-gray-700 mb-2">{t("loan.simulate.principalLabel")} <span className="text-red-500">*</span></label>
							<Input
								id="simulate-principal"
								type="number"
								step="1"
								min="1"
								required
								value={principal}
								onChange={(e) => setPrincipal(e.target.value)}
								placeholder="10000"
								className="h-10 px-3 py-2.5 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.simulate.rateLabel")}</label>
							<Input
								type="number"
								step="0.1"
								min="0"
								value={annualRate}
								onChange={(e) => setAnnualRate(e.target.value)}
								placeholder="8"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.simulate.durationLabel")} <span className="text-red-500">*</span></label>
							<Input
								type="number"
								min="1"
								value={months}
								onChange={(e) => setMonths(e.target.value)}
								placeholder="36"
							/>
						</div>
					</div>
					<div className="mt-4">
						<Button type="submit" disabled={loading}>
							{loading ? t("loan.simulate.calculating") : t("loan.simulate.calculate")}
						</Button>
					</div>
				</div>
			</form>

			{result && (
				<div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
					<div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold text-white">{t("loan.simulate.resultTitle")}</h2>
								<p className="text-sm text-emerald-100">{t("loan.simulate.resultSubtitle")}</p>
							</div>
						</div>
					</div>
					<div className="p-5 space-y-5">
						<div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-5 border border-indigo-100">
							<dt className="text-sm font-medium text-indigo-700 mb-1">{t("loan.simulate.monthlyPayment")}</dt>
							<dd className="text-2xl font-bold text-indigo-600">{formatAmount(result.monthlyPayment, "USD", locale)}</dd>
							<p className="text-xs text-indigo-600/80 mt-1">{t("loan.simulate.monthlyHint")}</p>
						</div>
						<dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.simulate.totalRepayment")}</dt>
								<dd className="text-lg font-bold text-gray-900">{formatAmount(result.totalPayment, "USD", locale)}</dd>
							</div>
							<div className="bg-amber-50/80 rounded-lg p-4 border border-amber-100">
								<dt className="text-sm font-medium text-amber-700 mb-1">{t("loan.simulate.totalInterest")}</dt>
								<dd className="text-lg font-semibold text-amber-900">{formatAmount(result.totalInterest, "USD", locale)}</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.simulate.principal")}</dt>
								<dd className="text-lg font-semibold text-gray-700">{formatAmount(result.principal, "USD", locale)}</dd>
							</div>
						</dl>
					</div>
				</div>
			)}
		</div>
	);
}
