"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { accountsApi, customersApi, productsApi } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { Customer, Product, ProductPeriod, OpenProductRequest, Account } from "@/types";

export default function NewLoanPage() {
	const { t } = useTranslation();
	const { showToast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);
	const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
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
				const [customersRes, productsRes] = await Promise.all([
					customersApi.list({ status: "VERIFIED", size: 1000 }),
					productsApi.list({ category: "LOAN", status: "ACTIVE", size: 100 })
				]);
				setCustomers(customersRes.content);
				setProducts(productsRes.content);
			} catch (e: any) {
				showToast(e?.message ?? "Erreur chargement", "error");
			}
		}
		load();
	}, []);

	useEffect(() => {
		if (!form.productId) {
			setPeriods([]);
			return;
		}
		productsApi.getPeriods(form.productId).then((p) => setPeriods(p.filter((x) => x.isActive))).catch(() => setPeriods([]));
	}, [form.productId]);

	useEffect(() => {
		if (!form.clientId) {
			setClientAccounts([]);
			setForm((prev) => ({ ...prev, sourceAccountId: undefined }));
			return;
		}
		accountsApi.getClientAccounts(form.clientId).then((acc) => {
			setClientAccounts(acc.filter((a) => a.status === "ACTIVE" && a.product?.category === "CURRENT_ACCOUNT"));
		}).catch(() => setClientAccounts([]));
	}, [form.clientId]);

	// Sync client state when form.clientId changes
	useEffect(() => {
		const id = form.clientId;
		if (typeof id === "number" && id > 0) {
			const foundClient = customers.find((c) => c.id === id);
			setClient(foundClient ?? null);
		} else {
			setClient(null);
		}
	}, [form.clientId, customers]);

	const selectedProduct = products.find((p) => p.id === form.productId);

	const filteredCustomers = customers.filter((c) => {
		if (!clientSearch.trim()) return true;
		const q = clientSearch.toLowerCase();
		return (
			c.displayName?.toLowerCase().includes(q) ||
			c.email?.toLowerCase().includes(q) ||
			c.phone?.toLowerCase().includes(q)
		);
	});

	function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((prev) => {
			const next = { ...prev, [key]: value };
			if (key === "productId") {
				next.periodId = undefined;
				const p = products.find((x) => x.id === value);
				if (p?.currency) next.currency = p.currency;
			}
			return next;
		});
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.clientId || !form.productId || form.openingAmount == null || form.openingAmount <= 0) {
			showToast("Client, produit et montant sont requis.", "error");
			return;
		}
		if (selectedProduct && (form.openingAmount < (selectedProduct.minBalance ?? 0) || form.openingAmount > (selectedProduct.maxBalance ?? Infinity))) {
			showToast("Le montant est hors des limites du produit.", "error");
			return;
		}
		if (periods.length > 0 && !form.periodId) {
			showToast("Veuillez sélectionner une durée.", "error");
			return;
		}
		setLoading(true);
		try {
			const payload: OpenProductRequest = {
				productId: form.productId,
				openingAmount: form.openingAmount,
				periodId: form.periodId && form.periodId > 0 ? form.periodId : undefined,
				currency: form.currency || undefined,
				sourceAccountId: form.sourceAccountId && form.sourceAccountId > 0 ? form.sourceAccountId : undefined
			};
			const created = await accountsApi.openProduct(form.clientId, payload);
			showToast("Prêt ouvert avec succès.", "success");
			router.push(`/loans/${created.id}`);
		} catch (e: any) {
			showToast(e?.message ?? "Erreur à l'ouverture du prêt", "error");
		} finally {
			setLoading(false);
		}
	}

	const inputClass = "w-full h-10 px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/loans" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des prêts
				</Link>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Ouvrir un prêt</h1>
						<p className="text-gray-600 mt-1">Choisir le client, le produit prêt, la durée et le montant.</p>
					</div>
				</div>
			</div>

			<form onSubmit={onSubmit} className="space-y-6">
				{/* Section 1 : Client et produit */}
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Client et produit</h2>
					</div>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-semibold text-gray-900 mb-2">
									{t("account.new.client")}
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
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Produit prêt <span className="text-red-500">*</span>
								</label>
								<select
									className={inputClass}
									value={form.productId || ""}
									onChange={(e) => update("productId", Number(e.target.value))}
									required
								>
									<option value={0}>Sélectionner un produit</option>
									{products.map((p) => (
										<option key={p.id} value={p.id}>{p.name} ({p.code})</option>
									))}
								</select>
								{selectedProduct && (
									<p className="mt-1 text-xs text-gray-500">
										Montant : {selectedProduct.minBalance} – {selectedProduct.maxBalance} {selectedProduct.currency}
									</p>
								)}
							</div>
						</div>
						{periods.length > 0 && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Durée <span className="text-red-500">*</span>
								</label>
								<select
									className={inputClass}
									value={form.periodId ?? ""}
									onChange={(e) => update("periodId", e.target.value ? Number(e.target.value) : undefined)}
									required
								>
									<option value="">Sélectionner une période</option>
									{periods.map((p) => (
										<option key={p.id} value={p.id}>
											{p.periodName} – Taux {p.interestRate ?? 0} %
										</option>
									))}
								</select>
							</div>
						)}
					</div>
				</div>

				{/* Section 2 : Montant et financement */}
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Montant et financement</h2>
					</div>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Montant du prêt <span className="text-red-500">*</span>
							</label>
							<Input
								type="number"
								step="0.01"
								min={selectedProduct?.minBalance ?? 0}
								max={selectedProduct?.maxBalance ?? undefined}
								value={form.openingAmount ?? ""}
								onChange={(e) => update("openingAmount", e.target.value ? Number(e.target.value) : undefined)}
								placeholder="Montant"
								required
								className={inputClass}
							/>
						</div>
						{clientAccounts.length > 0 && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Compte source (frais de dossier)</label>
								<select
									className={inputClass}
									value={form.sourceAccountId ?? ""}
									onChange={(e) => update("sourceAccountId", e.target.value ? Number(e.target.value) : undefined)}
								>
									<option value="">Aucun (si pas de frais)</option>
									{clientAccounts.map((a) => (
										<option key={a.id} value={a.id}>{a.accountNumber} – {a.balance} {a.currency}</option>
									))}
								</select>
							</div>
						)}
					</div>
				</div>

				{/* Info produit sélectionné */}
				{selectedProduct && (
					<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
								<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h2 className="text-lg font-semibold text-gray-900">Produit sélectionné</h2>
						</div>
						<div>
							<p className="font-medium text-gray-900 mb-1">{selectedProduct.name}</p>
							<p className="text-sm text-gray-600">
								Montant autorisé entre {selectedProduct.minBalance} et {selectedProduct.maxBalance} {selectedProduct.currency}.
								{selectedProduct.defaultInterestRate != null && ` Taux par défaut : ${selectedProduct.defaultInterestRate} %.`}
							</p>
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-3 pt-4">
					<Button type="submit" disabled={loading || !form.clientId} className="flex items-center gap-2">
						{loading ? (
							<>
								<div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								Création en cours...
							</>
						) : (
							<>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Ouvrir le prêt
							</>
						)}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
						Annuler
					</Button>
				</div>
			</form>

			{/* Client Search Modal - same as /accounts/new */}
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
