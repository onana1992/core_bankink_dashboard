"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { accountsApi, customersApi, productsApi } from "@/lib/api";
import type { Customer, Product, ProductPeriod, OpenProductRequest, Account, ProductFee } from "@/types";

export default function NewAccountPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);
	const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
	const [productFees, setProductFees] = useState<ProductFee[]>([]);
	const [client, setClient] = useState<Customer | null>(null);
	const [showClientModal, setShowClientModal] = useState(false);
	const [clientSearch, setClientSearch] = useState("");

	const clientIdParam = searchParams.get("clientId");

	const [form, setForm] = useState<OpenProductRequest & { clientId: number | "" }>({
		clientId: clientIdParam ? Number(clientIdParam) : "",
		productId: 0,
		openingAmount: undefined,
		periodId: undefined,
		currency: undefined,
		sourceAccountId: undefined
	});

	useEffect(() => {
		async function load() {
			try {
				const [customersResponse, productsResponse] = await Promise.all([
					customersApi.list({ status: "VERIFIED", size: 1000 }), // Load all verified customers
					productsApi.list({ status: "ACTIVE", size: 1000 }) // Load all active products
				]);
				setCustomers(customersResponse.content);
				setProducts(productsResponse.content);
			} catch (e: any) {
				setError(e?.message ?? t("account.new.errors.loadError"));
			}
		}
		load();
	}, []);

	useEffect(() => {
		async function loadPeriods() {
			if (form.productId) {
				try {
					const periodsData = await productsApi.getPeriods(form.productId);
					setPeriods(periodsData.filter(p => p.isActive));
				} catch (e) {
					console.error(t("account.new.errors.periodsLoadError"), e);
					setPeriods([]);
				}
			} else {
				setPeriods([]);
			}
		}
		loadPeriods();
	}, [form.productId]);

	useEffect(() => {
		async function loadProductFees() {
			if (form.productId) {
				try {
					const fees = await productsApi.getFees(form.productId);
					setProductFees(fees.filter(f => f.isActive));
				} catch (e) {
					console.error("Error loading product fees", e);
					setProductFees([]);
				}
			} else {
				setProductFees([]);
			}
		}
		loadProductFees();
	}, [form.productId]);

	useEffect(() => {
			async function loadClientAccounts() {
				if (form.clientId && form.clientId !== "") {
					try {
						const accounts = await accountsApi.getClientAccounts(form.clientId);
						console.log("📋 Comptes chargés:", accounts);
						console.log("📋 Détails des comptes:", accounts.map(a => ({
							id: a.id,
							accountNumber: a.accountNumber,
							status: a.status,
							product: a.product,
							productCategory: a.product?.category
						})));
						
						// Filtrer uniquement les comptes actifs ET les comptes courants (CURRENT_ACCOUNT)
						const currentAccounts = accounts.filter(a => {
							const isActive = a.status === "ACTIVE";
							const isCurrentAccount = a.product?.category === "CURRENT_ACCOUNT";
							console.log(`Compte ${a.accountNumber}: active=${isActive}, currentAccount=${isCurrentAccount}, product=${JSON.stringify(a.product)}`);
							return isActive && isCurrentAccount;
						});
						
						console.log("✅ Comptes courants filtrés:", currentAccounts);
						setClientAccounts(currentAccounts);
					} catch (e) {
						console.error(t("account.new.errors.accountsLoadError"), e);
						setClientAccounts([]);
					}
				} else {
					setClientAccounts([]);
					setForm(prev => ({ ...prev, sourceAccountId: undefined }));
				}
			}
		loadClientAccounts();
	}, [form.clientId]);

	// Update client state when form.clientId changes
	useEffect(() => {
		if (form.clientId && form.clientId !== "") {
			const foundClient = customers.find(c => c.id === form.clientId);
			setClient(foundClient || null);
		} else {
			setClient(null);
		}
	}, [form.clientId, customers]);

	const selectedProduct = products.find(p => p.id === form.productId);
	const selectedPeriod = periods.find(p => p.id === form.periodId);
	
	// Trouver le frais d'ouverture actif
	const openingFee = productFees.find(fee => 
		fee.feeType === "OPENING" && 
		fee.isActive &&
		new Date(fee.effectiveFrom) <= new Date() &&
		(!fee.effectiveTo || new Date(fee.effectiveTo) >= new Date())
	);

	const hasOpeningFees = !!openingFee;

	// Calculer le montant des frais d'ouverture (pour affichage uniquement, pas pour pré-remplir)
	const calculateOpeningFeeAmount = (): number | undefined => {
		if (!openingFee) return undefined;
		
		// Pour les frais fixes, utiliser feeAmount
		if (openingFee.feeCalculationBase === "FIXED" && openingFee.feeAmount) {
			return openingFee.feeAmount;
		}
		
		// Pour les autres types, on ne peut pas calculer sans compte/solde
		// Mais on peut utiliser minFee comme indication si disponible
		if (openingFee.minFee) {
			return openingFee.minFee;
		}
		
		return undefined;
	};

	const openingFeeAmount = calculateOpeningFeeAmount();

	const filteredCustomers = customers.filter((customer) => {
		if (!clientSearch.trim()) return true;
		const searchLower = clientSearch.toLowerCase();
		return (
			customer.displayName?.toLowerCase().includes(searchLower) ||
			customer.email?.toLowerCase().includes(searchLower) ||
			customer.phone?.toLowerCase().includes(searchLower)
		);
	});

	function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
		setForm(prev => {
			const updated = { ...prev, [key]: value };
			// Réinitialiser periodId si le produit change
			if (key === "productId") {
				updated.periodId = undefined;
				// Mettre à jour automatiquement la devise avec celle du produit
				const newProduct = products.find(p => p.id === value);
				if (newProduct?.currency) {
					updated.currency = newProduct.currency;
				}
			}
			return updated;
		});
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		if (!form.clientId || form.clientId === "") {
			setError(t("account.new.errors.clientRequired"));
			setLoading(false);
			return;
		}

		if (!form.productId || form.productId === 0) {
			setError(t("account.new.errors.productRequired"));
			setLoading(false);
			return;
		}

		// Vérifier que le compte source est fourni si le produit a des frais d'ouverture
		if (hasOpeningFees && (!form.sourceAccountId || form.sourceAccountId === 0)) {
			setError(t("account.new.errors.sourceAccountRequired"));
			setLoading(false);
			return;
		}

		const payload: OpenProductRequest = {
			productId: form.productId,
			openingAmount: form.openingAmount,
			periodId: form.periodId,
			currency: form.currency,
			sourceAccountId: form.sourceAccountId
		};

		try {
			const created = await accountsApi.openProduct(form.clientId, payload);
			router.push(`/accounts/${created.id}`);
		} catch (e: any) {
			// Mapper les erreurs du backend vers les clés de traduction
			const errorMessage = e?.message || "";
			let translatedError = errorMessage;
			
			if (errorMessage.includes("error.source.account.different.client")) {
				translatedError = t("account.new.errors.sourceAccountDifferentClient");
			} else if (errorMessage.includes("error.source.account.not.found")) {
				translatedError = t("account.new.errors.sourceAccountRequired");
			} else if (errorMessage.includes("error.opening.fee.requires.source.account")) {
				translatedError = t("account.new.errors.sourceAccountRequired");
			} else if (errorMessage) {
				// Essayer de traduire d'autres erreurs connues
				const errorKey = errorMessage.replace("error.", "").replace(/\./g, "");
				const translationKey = `account.new.errors.${errorKey}`;
				const translation = t(translationKey);
				// Si la traduction existe (différente de la clé), l'utiliser
				if (translation !== translationKey) {
					translatedError = translation;
				} else {
					translatedError = errorMessage || t("account.new.errors.openError");
				}
			} else {
				translatedError = t("account.new.errors.openError");
			}
			
			setError(translatedError);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="max-w-4xl mx-auto">
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
						</div>
						<div className="flex-1">
							<h1 className="text-2xl font-bold text-gray-900">{t("account.new.title")}</h1>
							<p className="text-sm text-gray-600 mt-1">{t("account.new.subtitle")}</p>
						</div>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={onSubmit} className="p-6 space-y-6">
					{error && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<div className="flex items-center gap-2">
								<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p className="text-sm font-medium text-red-800">{error}</p>
							</div>
						</div>
					)}

					{/* Client */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							{t("account.new.client")} <span className="text-red-500">*</span>
						</label>
						{!client ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setShowClientModal(true);
									setClientSearch("");
								}}
								className="w-full justify-start h-12 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
							>
								<svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								{t("transaction.form.client.searchAndSelect")}
							</Button>
						) : (
							<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
												<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
												</svg>
											</div>
											<div>
												<div className="text-sm font-semibold text-gray-900">{client.displayName}</div>
												<div className="text-xs text-gray-600 mt-0.5">
													{client.email && (
														<span className="flex items-center gap-1">
															<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
															</svg>
															{client.email}
														</span>
													)}
													{client.phone && (
														<span className="flex items-center gap-1 mt-1">
															<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
															</svg>
															{client.phone}
														</span>
													)}
												</div>
											</div>
										</div>
										<div className="mt-2">
											<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
												<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
												</svg>
												{t(`customer.statuses.${client.status}`)}
											</span>
										</div>
									</div>
									<div className="flex gap-2 ml-3">
										<button
											type="button"
											onClick={() => {
												setShowClientModal(true);
												setClientSearch("");
											}}
											className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
										>
											{t("transaction.form.client.edit")}
										</button>
										<button
											type="button"
											onClick={() => {
												update("clientId", "");
												setClient(null);
											}}
											className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								</div>
							</div>
						)}
						{client && client.status !== "VERIFIED" && (
							<div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
								<div className="flex items-center gap-2">
									<svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									<p className="text-sm text-yellow-800">
										{t("account.new.clientMustBeVerified")}
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Produit */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							{t("account.new.product")} <span className="text-red-500">*</span>
						</label>
						<select
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							value={form.productId}
							onChange={(e) => update("productId", Number(e.target.value))}
							required
						>
							<option value={0}>{t("account.new.selectProduct")}</option>
							{products.map(p => (
								<option key={p.id} value={p.id}>
									{p.name} ({p.code}) - {p.category}
								</option>
							))}
						</select>
						{selectedProduct && (
							<div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
								{selectedProduct.description && (
									<p className="text-sm text-gray-700 mb-2">{selectedProduct.description}</p>
								)}
								<div className="grid grid-cols-2 gap-3 text-sm">
									{typeof selectedProduct.minBalance === 'number' && (
										<div>
											<span className="text-gray-600">{t("account.new.minAmount", { 
												amount: selectedProduct.minBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
												currency: selectedProduct.currency 
											})}</span>
										</div>
									)}
									{typeof selectedProduct.maxBalance === 'number' && (
										<div>
											<span className="text-gray-600">{t("account.new.maxAmount", { 
												amount: selectedProduct.maxBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
												currency: selectedProduct.currency 
											})}</span>
										</div>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Période (si applicable) */}
					{periods.length > 0 && (
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">
								{t("account.new.period")}
							</label>
							<select
								className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
								value={form.periodId ?? ""}
								onChange={(e) => update("periodId", e.target.value ? Number(e.target.value) : undefined)}
							>
								<option value="">{t("account.new.noPeriod")}</option>
								{periods.map(p => (
									<option key={p.id} value={p.id}>
										{p.minAmount && p.maxAmount 
											? t("account.new.periodWithAmounts", { 
												name: p.periodName, 
												rate: p.interestRate || 0, 
												min: p.minAmount, 
												max: p.maxAmount 
											})
											: p.interestRate 
												? t("account.new.periodName", { name: p.periodName, rate: p.interestRate })
												: p.periodName
										}
									</option>
								))}
							</select>
							{selectedPeriod && (
								<div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
									<div className="grid grid-cols-2 gap-3 text-sm">
										{selectedPeriod.interestRate && (
											<div>
												<span className="text-gray-600">{t("account.new.interestRate", { rate: selectedPeriod.interestRate })}</span>
											</div>
										)}
										{selectedPeriod.periodDays && (
											<div>
												<span className="text-gray-600">{t("account.new.duration", { days: selectedPeriod.periodDays })}</span>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					)}

					{/* Montant d'ouverture */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							{t("account.new.openingAmount")}
						</label>
						<Input
							type="number"
							step="0.01"
							min="0"
							value={form.openingAmount ?? ""}
							onChange={(e) => update("openingAmount", e.target.value ? Number(e.target.value) : undefined)}
							placeholder="0.00"
							className="w-full"
						/>
						{selectedProduct && (
							<p className="text-xs text-gray-500 mt-2">
								{t("account.new.currencyLabel", { currency: selectedProduct.currency })}
							</p>
						)}
						{openingFee && openingFeeAmount && (
							<div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
								<div className="flex items-center gap-2">
									<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<p className="text-xs text-blue-800">
										{t("account.new.openingFeeInfo", { 
											amount: openingFeeAmount.toFixed(2), 
											currency: selectedProduct?.currency || openingFee.currency 
										})}
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Devise */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							{t("account.new.currency")}
						</label>
						<Input
							value={form.currency ?? selectedProduct?.currency ?? "USD"}
							onChange={(e) => update("currency", e.target.value || undefined)}
							placeholder="USD"
							maxLength={3}
							disabled
							className="w-full bg-gray-50 cursor-not-allowed"
						/>
						<p className="text-xs text-gray-500 mt-2">{t("account.new.currencyHint")}</p>
					</div>

					{/* Compte source pour les frais d'ouverture */}
					{hasOpeningFees && (
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">
								{t("account.new.sourceAccount")} <span className="text-red-500">*</span>
							</label>
							{clientAccounts.length === 0 ? (
								<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
									<div className="flex items-center gap-2">
										<svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
										<p className="text-sm text-yellow-800">
											{t("account.new.noSourceAccountAvailable")}
										</p>
									</div>
								</div>
							) : (
								<select
									className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									value={form.sourceAccountId ?? ""}
									onChange={(e) => update("sourceAccountId", e.target.value ? Number(e.target.value) : undefined)}
									required
								>
								<option value="">{t("account.new.selectSourceAccount")}</option>
								{clientAccounts.map(account => (
									<option key={account.id} value={account.id}>
										{account.accountNumber} - {account.currency} - 
										{account.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {account.currency}
										{account.product && ` (${account.product.name})`}
									</option>
								))}
								</select>
							)}
							{form.sourceAccountId && clientAccounts.length > 0 && (
								<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
									<div className="grid grid-cols-2 gap-3 text-sm">
										<div>
											<span className="text-gray-600">{t("transaction.form.account.account")}</span>
											<span className="ml-2 font-semibold text-gray-900">
												{clientAccounts.find(a => a.id === form.sourceAccountId)?.accountNumber}
											</span>
										</div>
										<div>
											<span className="text-gray-600">{t("transaction.form.account.balance")}</span>
											<span className="ml-2 font-semibold text-green-700">
												{clientAccounts.find(a => a.id === form.sourceAccountId)?.balance.toFixed(2)} {clientAccounts.find(a => a.id === form.sourceAccountId)?.currency}
											</span>
										</div>
									</div>
								</div>
							)}
							<p className="text-xs text-gray-500 mt-2">
								{t("account.new.sourceAccountHint")}
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-4 pt-4 border-t border-gray-200">
						<Link href="/accounts" className="flex-1">
							<Button type="button" variant="outline" className="w-full">
								{t("account.new.cancel")}
							</Button>
						</Link>
						<Button 
							type="submit" 
							disabled={loading || !form.clientId || !form.productId || (hasOpeningFees && !form.sourceAccountId)}
							className="flex-1"
						>
							{loading ? t("account.new.opening") : t("account.new.open")}
						</Button>
					</div>
				</form>
			</div>

			{/* Client Search Modal */}
			{showClientModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
					<div 
						className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
						onClick={() => {
							setShowClientModal(false);
							setClientSearch("");
						}}
					></div>
					<div className="flex min-h-full items-center justify-center p-4">
						<div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-2xl">
							<div className="px-6 py-4 border-b border-gray-200">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold text-gray-900">{t("transaction.form.client.searchModal.title")}</h3>
									<button
										type="button"
										onClick={() => {
											setShowClientModal(false);
											setClientSearch("");
										}}
										className="text-gray-400 hover:text-gray-600"
									>
										<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							</div>
							<div className="px-6 py-4">
								<div className="mb-4">
									<div className="relative">
										<Input
											type="text"
											placeholder={t("transaction.form.client.searchModal.searchPlaceholder")}
											value={clientSearch}
											onChange={(e) => setClientSearch(e.target.value)}
											className="w-full pl-10"
											autoFocus
										/>
										<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
											</svg>
										</div>
										{clientSearch && (
											<button
												type="button"
												onClick={() => setClientSearch("")}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
											>
												<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										)}
									</div>
								</div>
								<div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
									{filteredCustomers.length === 0 ? (
										<div className="p-8 text-center text-gray-500">
											{clientSearch ? (
												<div>
													<svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													<p className="text-sm">{t("transaction.form.client.searchModal.noResults")}</p>
												</div>
											) : (
												<div>
													<svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
													</svg>
													<p className="text-sm">{t("transaction.form.client.searchModal.startTyping")}</p>
												</div>
											)}
										</div>
									) : (
										<div className="divide-y divide-gray-200">
											{filteredCustomers.map((customer) => (
												<button
													key={customer.id}
													type="button"
													onClick={() => {
														update("clientId", customer.id);
														setClient(customer);
														setShowClientModal(false);
														setClientSearch("");
													}}
													className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors focus:outline-none focus:bg-blue-50"
												>
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="font-medium text-gray-900">{customer.displayName}</div>
															<div className="mt-1 text-sm text-gray-600 space-y-0.5">
																{customer.email && (
																	<div className="flex items-center gap-1">
																		<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
																		</svg>
																		{customer.email}
																	</div>
																)}
																{customer.phone && (
																	<div className="flex items-center gap-1">
																		<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
																		</svg>
																		{customer.phone}
																	</div>
																)}
															</div>
														</div>
														<div className="ml-4">
															<span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
																✓ {t(`customer.statuses.${customer.status}`)}
															</span>
														</div>
													</div>
												</button>
											))}
										</div>
									)}
								</div>
							</div>
							<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
								<div className="flex justify-end">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setShowClientModal(false);
											setClientSearch("");
										}}
									>
										{t("transaction.form.client.searchModal.close")}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

