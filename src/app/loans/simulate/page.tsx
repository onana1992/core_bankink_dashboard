"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loansApi, productsApi } from "@/lib/api";
import {
	estimateOpeningFeeAmount,
	findActiveOpeningFee,
	periodMonths,
	resolveAnnualRatePercent
} from "@/lib/loanApplicationUtils";
import { formatAmount } from "@/lib/utils";
import type { LoanSimulationPreview, LoanSimulationResult } from "@/types";
import type { Product, ProductFee, ProductInterestRate, ProductPeriod } from "@/types/product";

export default function LoanSimulatePage() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";

	const [products, setProducts] = useState<Product[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);
	const [lendingRates, setLendingRates] = useState<ProductInterestRate[]>([]);
	const [fees, setFees] = useState<ProductFee[]>([]);
	const [loadingCatalog, setLoadingCatalog] = useState(true);

	const [productId, setProductId] = useState<number | "">("");
	const [periodId, setPeriodId] = useState<number | "">("");
	const [amount, setAmount] = useState<string>("");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<LoanSimulationResult | null>(null);
	const [preview, setPreview] = useState<LoanSimulationPreview | null>(null);

	const selectedProduct = products.find((p) => p.id === productId);
	const selectedPeriod = periods.find((p) => p.id === periodId);
	const amountMin =
		selectedPeriod?.minAmount ?? selectedProduct?.minBalance ?? 1;
	const amountMax =
		selectedPeriod?.maxAmount ?? selectedProduct?.maxBalance ?? undefined;
	const currency = selectedProduct?.currency ?? "XAF";
	const principalNum = Number(amount);

	const resolvedRate = useMemo(() => {
		if (!selectedProduct) return null;
		return resolveAnnualRatePercent(
			selectedPeriod ?? null,
			selectedProduct,
			lendingRates,
			principalNum > 0 ? principalNum : 0
		);
	}, [selectedProduct, selectedPeriod, lendingRates, principalNum]);

	const resolvedMonths = useMemo(
		() => (selectedPeriod ? periodMonths(selectedPeriod) : null),
		[selectedPeriod]
	);

	const estimatedOpeningFee = useMemo(() => {
		if (!selectedProduct || principalNum <= 0) return null;
		const fee = findActiveOpeningFee(fees, selectedProduct.currency ?? currency);
		return estimateOpeningFeeAmount(fee, principalNum);
	}, [selectedProduct, fees, currency, principalNum]);

	useEffect(() => {
		async function loadProducts() {
			setLoadingCatalog(true);
			try {
				const res = await productsApi.list({ category: "LOAN", status: "ACTIVE", size: 100 });
				setProducts(res.content);
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : t("loan.simulate.loadError");
				setError(msg);
			} finally {
				setLoadingCatalog(false);
			}
		}
		loadProducts();
	}, [t]);

	useEffect(() => {
		if (productId === "") {
			setPeriods([]);
			setLendingRates([]);
			setFees([]);
			setPeriodId("");
			return;
		}
		const pid = productId as number;
		Promise.all([
			productsApi.getPeriods(pid).then((p) => p.filter((x) => x.isActive)),
			productsApi.getInterestRates(pid),
			productsApi.getFees(pid)
		])
			.then(([p, rates, productFees]) => {
				setPeriods(p);
				setLendingRates(rates);
				setFees(productFees);
				setPeriodId("");
			})
			.catch(() => {
				setPeriods([]);
				setLendingRates([]);
				setFees([]);
			});
	}, [productId]);

	function validateForm(): string | null {
		if (productId === "") return t("loan.simulate.errors.selectProduct");
		if (periods.length > 0 && periodId === "") return t("loan.simulate.errors.selectPeriod");
		if (!amount || principalNum <= 0) return t("loan.simulate.errors.invalidAmount");

		const product = selectedProduct!;
		const minProduct = product.minBalance ?? 0;
		const maxProduct = product.maxBalance ?? Infinity;
		if (principalNum < minProduct || principalNum > maxProduct) {
			return t("loan.simulate.errors.amountOutOfProductRange", {
				min: minProduct,
				max: maxProduct === Infinity ? "—" : maxProduct,
				currency: product.currency ?? currency
			});
		}

		if (selectedPeriod) {
			const minPeriod = selectedPeriod.minAmount ?? minProduct;
			const maxPeriod = selectedPeriod.maxAmount ?? maxProduct;
			if (principalNum < minPeriod || principalNum > maxPeriod) {
				return t("loan.simulate.errors.amountOutOfPeriodRange", {
					min: minPeriod,
					max: maxPeriod,
					currency: product.currency ?? currency
				});
			}
		}

		if (resolvedRate == null || resolvedRate <= 0) {
			return t("loan.simulate.errors.noRate");
		}
		if (resolvedMonths == null || resolvedMonths <= 0) {
			return t("loan.simulate.errors.noDuration");
		}
		return null;
	}

	async function runSimulation(e: React.FormEvent) {
		e.preventDefault();
		const validationError = validateForm();
		if (validationError) {
			setError(validationError);
			return;
		}

		setLoading(true);
		setError(null);
		setResult(null);
		setPreview(null);

		try {
			const rate = resolvedRate!;
			const months = resolvedMonths!;
			const res = await loansApi.simulate(principalNum, rate, months);
			setResult(res);
			setPreview({
				productId: productId as number,
				productName: selectedProduct!.name,
				productCode: selectedProduct!.code,
				currency: selectedProduct!.currency ?? currency,
				periodId: periodId as number,
				periodName: selectedPeriod?.periodName ?? t("loan.simulate.defaultPeriod"),
				periodMonths: months,
				annualRatePercent: rate,
				estimatedOpeningFee
			});
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : t("loan.simulate.errorGeneric");
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	const inputClass =
		"w-full h-10 px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none";

	return (
		<div className="space-y-6">
			<div>
				<Link
					href="/loans"
					className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("loan.backToList")}
				</Link>
				<h1 className="text-3xl font-bold text-gray-900">{t("sidebar.loanSimulation")}</h1>
				<p className="text-gray-600 mt-1">{t("loan.simulate.subtitle")}</p>
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

					{loadingCatalog ? (
						<p className="text-sm text-gray-500">{t("loan.simulate.loadingCatalog")}</p>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t("loan.simulate.productLabel")} <span className="text-red-500">*</span>
								</label>
								<select
									className={inputClass}
									value={productId}
									onChange={(e) => {
										setProductId(e.target.value === "" ? "" : Number(e.target.value));
										setResult(null);
										setPreview(null);
										setError(null);
									}}
									required
								>
									<option value="">{t("loan.simulate.selectProduct")}</option>
									{products.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name} ({p.code})
										</option>
									))}
								</select>
							</div>

							{productId !== "" && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										{t("loan.simulate.periodLabel")}{" "}
										{periods.length > 0 && <span className="text-red-500">*</span>}
									</label>
									{periods.length === 0 ? (
										<p className="text-sm text-amber-700 py-2">{t("loan.simulate.noPeriods")}</p>
									) : (
										<>
											<select
												className={inputClass}
												value={periodId}
												onChange={(e) => {
													setPeriodId(e.target.value === "" ? "" : Number(e.target.value));
													setResult(null);
													setPreview(null);
												}}
												required={periods.length > 0}
											>
												<option value="">{t("loan.simulate.selectPeriod")}</option>
												{periods.map((p) => (
													<option key={p.id} value={p.id}>
														{p.periodName}
														{p.interestRate != null ? ` — ${p.interestRate} %` : ""}
														{` (${periodMonths(p)} ${t("loan.simulate.monthsShort")})`}
													</option>
												))}
											</select>
											{selectedPeriod && selectedProduct && (
												<p className="mt-1 text-xs text-gray-500">
													{t("loan.simulate.amountRange", {
														min: selectedPeriod.minAmount ?? selectedProduct.minBalance ?? 0,
														max:
															selectedPeriod.maxAmount ??
															selectedProduct.maxBalance ??
															"—",
														currency: selectedProduct.currency ?? currency
													})}
												</p>
											)}
										</>
									)}
								</div>
							)}

							<div className="md:col-span-2">
								<label htmlFor="simulate-amount" className="block text-sm font-medium text-gray-700 mb-2">
									{t("loan.simulate.amountLabel")} <span className="text-red-500">*</span>
								</label>
								<Input
									id="simulate-amount"
									type="number"
									step="1"
									min={amountMin}
									max={amountMax}
									required
									value={amount}
									onChange={(e) => {
										setAmount(e.target.value);
										setResult(null);
										setPreview(null);
									}}
									placeholder={t("loan.simulate.amountPlaceholder")}
									className="h-10 px-3 py-2.5 border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
								/>
								{selectedProduct && (
									<p className="mt-1 text-xs text-gray-500">{currency}</p>
								)}
							</div>
						</div>
					)}

					{selectedProduct && selectedPeriod && principalNum > 0 && (
						<div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
							<div>
								<span className="text-indigo-600">{t("loan.simulate.resolvedRate")}</span>
								<p className="font-semibold text-indigo-900">
									{resolvedRate != null ? `${resolvedRate} %` : "—"}
								</p>
							</div>
							<div>
								<span className="text-indigo-600">{t("loan.simulate.resolvedDuration")}</span>
								<p className="font-semibold text-indigo-900">
									{resolvedMonths != null
										? t("loan.detail.periodMonths", { count: resolvedMonths })
										: "—"}
								</p>
							</div>
							<div>
								<span className="text-indigo-600">{t("loan.simulate.estimatedOpeningFee")}</span>
								<p className="font-semibold text-indigo-900">
									{estimatedOpeningFee != null
										? formatAmount(estimatedOpeningFee, currency, locale)
										: t("loan.simulate.noOpeningFee")}
								</p>
							</div>
						</div>
					)}

					<div className="mt-4">
						<Button type="submit" disabled={loading || loadingCatalog || productId === ""}>
							{loading ? t("loan.simulate.calculating") : t("loan.simulate.calculate")}
						</Button>
					</div>
				</div>
			</form>

			{result && preview && (
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
								<p className="text-sm text-emerald-100">
									{preview.productName} — {preview.periodName}
								</p>
							</div>
						</div>
					</div>
					<div className="p-5 space-y-5">
						<div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-5 border border-indigo-100">
							<dt className="text-sm font-medium text-indigo-700 mb-1">{t("loan.simulate.monthlyPayment")}</dt>
							<dd className="text-2xl font-bold text-indigo-600">
								{formatAmount(result.monthlyPayment, preview.currency, locale)}
							</dd>
							<p className="text-xs text-indigo-600/80 mt-1">{t("loan.simulate.monthlyHint")}</p>
						</div>
						<dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.simulate.totalRepayment")}</dt>
								<dd className="text-lg font-bold text-gray-900">
									{formatAmount(result.totalPayment, preview.currency, locale)}
								</dd>
							</div>
							<div className="bg-amber-50/80 rounded-lg p-4 border border-amber-100">
								<dt className="text-sm font-medium text-amber-700 mb-1">{t("loan.simulate.totalInterest")}</dt>
								<dd className="text-lg font-semibold text-amber-900">
									{formatAmount(result.totalInterest, preview.currency, locale)}
								</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.simulate.principal")}</dt>
								<dd className="text-lg font-semibold text-gray-700">
									{formatAmount(result.principal, preview.currency, locale)}
								</dd>
							</div>
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<dt className="text-sm font-medium text-gray-500 mb-1">{t("loan.simulate.annualRate")}</dt>
								<dd className="text-lg font-semibold text-gray-700">{preview.annualRatePercent} %</dd>
							</div>
						</dl>
						{preview.estimatedOpeningFee != null && preview.estimatedOpeningFee > 0 && (
							<p className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
								{t("loan.simulate.openingFeeNote", {
									amount: formatAmount(preview.estimatedOpeningFee, preview.currency, locale)
								})}
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
