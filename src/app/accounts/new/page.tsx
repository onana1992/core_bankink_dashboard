"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { accountsApi, customersApi, productsApi } from "@/lib/api";
import type { Customer, Product, ProductPeriod, OpenProductRequest } from "@/types";

export default function NewAccountPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);
	const [clientSearchQuery, setClientSearchQuery] = useState("");
	const [isClientModalOpen, setIsClientModalOpen] = useState(false);

	const clientIdParam = searchParams.get("clientId");

	const [form, setForm] = useState<OpenProductRequest & { clientId: number | "" }>({
		clientId: clientIdParam ? Number(clientIdParam) : "",
		productId: 0,
		openingAmount: undefined,
		periodId: undefined,
		currency: undefined
	});

	useEffect(() => {
		async function load() {
			try {
				const [customersData, productsData] = await Promise.all([
					customersApi.list(),
					productsApi.list({ status: "ACTIVE" })
				]);
				setCustomers(customersData.filter(c => c.status === "VERIFIED"));
				setProducts(productsData);
			} catch (e: any) {
				setError(e?.message ?? "Erreur lors du chargement des données");
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
					setPeriods([]);
				}
			} else {
				setPeriods([]);
			}
		}
		loadPeriods();
	}, [form.productId]);

	// Gérer la touche Escape pour fermer le modal
	useEffect(() => {
		function handleEscape(e: KeyboardEvent) {
			if (e.key === "Escape" && isClientModalOpen) {
				setIsClientModalOpen(false);
				setClientSearchQuery("");
			}
		}
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isClientModalOpen]);

	// Empêcher le scroll du body quand le modal est ouvert
	useEffect(() => {
		if (isClientModalOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isClientModalOpen]);

	const selectedProduct = products.find(p => p.id === form.productId);
	const selectedPeriod = periods.find(p => p.id === form.periodId);
	const selectedClient = customers.find(c => c.id === form.clientId);

	// Filtrer les clients selon la recherche
	const filteredCustomers = customers.filter(c => {
		if (!clientSearchQuery.trim()) return true;
		const query = clientSearchQuery.toLowerCase();
		return (
			c.displayName?.toLowerCase().includes(query) ||
			c.email?.toLowerCase().includes(query) ||
			c.phone?.toLowerCase().includes(query) ||
			c.firstName?.toLowerCase().includes(query) ||
			c.lastName?.toLowerCase().includes(query)
		);
	});

	function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
		setForm(prev => {
			const updated = { ...prev, [key]: value };
			// Réinitialiser periodId si le produit change
			if (key === "productId") {
				updated.periodId = undefined;
			}
			return updated;
		});
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		if (!form.clientId || form.clientId === "") {
			setError("Le client est requis");
			setLoading(false);
			return;
		}

		if (!form.productId || form.productId === 0) {
			setError("Le produit est requis");
			setLoading(false);
			return;
		}

		const payload: OpenProductRequest = {
			productId: form.productId,
			openingAmount: form.openingAmount,
			periodId: form.periodId,
			currency: form.currency
		};

		try {
			const created = await accountsApi.openProduct(form.clientId, payload);
			router.push(`/accounts/${created.id}`);
		} catch (e: any) {
			setError(e?.message ?? "Échec de l'ouverture du compte");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/accounts" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des comptes
				</Link>
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
						<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Ouvrir un nouveau compte</h1>
						<p className="text-gray-600 mt-1">Créez un compte bancaire pour un client vérifié</p>
					</div>
				</div>
			</div>

			{/* Message d'erreur */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div className="flex-1">
						<div className="font-medium">Erreur</div>
						<div className="text-sm mt-1">{error}</div>
					</div>
				</div>
			)}

			<form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-8">
				{/* Client */}
				<div>
					<label className="block text-sm font-semibold text-gray-900 mb-2">Client <span className="text-red-500">*</span></label>
					
					{/* Bouton pour ouvrir le modal */}
					{!selectedClient ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsClientModalOpen(true)}
							className="w-full justify-start h-12 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
						>
							<svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
							Rechercher et sélectionner un client
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
											<div className="text-sm font-semibold text-gray-900">{selectedClient.displayName}</div>
											<div className="text-xs text-gray-600 mt-0.5">
												{selectedClient.email && <span className="flex items-center gap-1">
													<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
													</svg>
													{selectedClient.email}
												</span>}
												{selectedClient.phone && <span className="flex items-center gap-1 mt-1">
													<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
													</svg>
													{selectedClient.phone}
												</span>}
											</div>
										</div>
									</div>
									<div className="mt-2">
										<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
											<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
												<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
											</svg>
											{selectedClient.status}
										</span>
									</div>
								</div>
								<div className="flex gap-2 ml-3">
									<button
										type="button"
										onClick={() => setIsClientModalOpen(true)}
										className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
										aria-label="Changer de client"
									>
										Modifier
									</button>
									<button
										type="button"
										onClick={() => {
											update("clientId", "");
											setClientSearchQuery("");
										}}
										className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
										aria-label="Désélectionner le client"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							</div>
						</div>
					)}

					{selectedClient && selectedClient.status !== "VERIFIED" && (
						<div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
							<svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
							</svg>
							<p className="text-sm text-red-800">
								Le client doit être vérifié (VERIFIED) pour ouvrir un compte
							</p>
						</div>
					)}
				</div>

				{/* Modal de recherche et sélection */}
				{isClientModalOpen && (
					<div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
						{/* Overlay */}
						<div 
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							onClick={() => {
								setIsClientModalOpen(false);
								setClientSearchQuery("");
							}}
						></div>

						{/* Modal */}
						<div className="flex min-h-full items-center justify-center p-4">
							<div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-2xl">
								{/* Header */}
								<div className="px-6 py-4 border-b border-gray-200">
									<div className="flex items-center justify-between">
										<h3 className="text-lg font-semibold text-gray-900">Rechercher un client</h3>
										<button
											type="button"
											onClick={() => {
												setIsClientModalOpen(false);
												setClientSearchQuery("");
											}}
											className="text-gray-400 hover:text-gray-600"
											aria-label="Fermer"
										>
											<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								</div>

								{/* Body */}
								<div className="px-6 py-4">
									{/* Champ de recherche */}
									<div className="mb-4">
										<div className="relative">
											<Input
												type="text"
												placeholder="Rechercher par nom, email, téléphone..."
												value={clientSearchQuery}
												onChange={(e) => setClientSearchQuery(e.target.value)}
												className="w-full pl-10"
												autoFocus
											/>
											<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
												<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
												</svg>
											</div>
											{clientSearchQuery && (
												<button
													type="button"
													onClick={() => setClientSearchQuery("")}
													className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
													aria-label="Effacer"
												>
													<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											)}
										</div>
										{clientSearchQuery && (
											<p className="text-xs text-gray-500 mt-2">
												{filteredCustomers.length === 0 
													? "Aucun client trouvé" 
													: `${filteredCustomers.length} client${filteredCustomers.length > 1 ? "s" : ""} trouvé${filteredCustomers.length > 1 ? "s" : ""}`
												}
											</p>
										)}
									</div>

									{/* Liste des clients */}
									<div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
										{filteredCustomers.length === 0 ? (
											<div className="p-8 text-center text-gray-500">
												{clientSearchQuery ? (
													<div>
														<svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<p className="text-sm">Aucun client ne correspond à votre recherche</p>
													</div>
												) : (
													<div>
														<svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
														</svg>
														<p className="text-sm">Tapez pour rechercher un client</p>
													</div>
												)}
											</div>
										) : (
											<div className="divide-y divide-gray-200">
												{filteredCustomers.map(c => (
													<button
														type="button"
														key={c.id}
														onClick={() => {
															update("clientId", c.id);
															setIsClientModalOpen(false);
															setClientSearchQuery("");
														}}
														className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors focus:outline-none focus:bg-blue-50"
													>
														<div className="flex items-start justify-between">
															<div className="flex-1">
																<div className="font-medium text-gray-900">{c.displayName}</div>
																<div className="mt-1 text-sm text-gray-600 space-y-0.5">
																	{c.email && <div className="flex items-center gap-1">
																		<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
																		</svg>
																		{c.email}
																	</div>}
																	{c.phone && <div className="flex items-center gap-1">
																		<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
																		</svg>
																		{c.phone}
																	</div>}
																</div>
															</div>
															<div className="ml-4">
																<span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
																	✓ {c.status}
																</span>
															</div>
														</div>
													</button>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Footer */}
								<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
									<div className="flex justify-end">
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setIsClientModalOpen(false);
												setClientSearchQuery("");
											}}
										>
											Fermer
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Produit */}
				<div>
					<label className="block text-sm font-semibold text-gray-900 mb-2">Produit bancaire <span className="text-red-500">*</span></label>
					<select
						className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
						value={form.productId}
						onChange={(e) => update("productId", Number(e.target.value))}
						required
					>
						<option value={0}>-- Sélectionner un produit --</option>
						{products.map(p => (
							<option key={p.id} value={p.id}>
								{p.name} ({p.code}) - {p.category}
							</option>
						))}
					</select>
					{selectedProduct && (
						<div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<h4 className="font-medium text-gray-900 mb-2">{selectedProduct.name}</h4>
							{selectedProduct.description && (
								<p className="text-sm text-gray-700 mb-3">{selectedProduct.description}</p>
							)}
							<div className="grid grid-cols-2 gap-3 text-sm">
								{selectedProduct.minBalance !== null && selectedProduct.minBalance !== undefined && (
									<div>
										<span className="text-gray-600">Montant minimum:</span>
										<span className="ml-2 font-semibold text-green-700">{selectedProduct.minBalance} {selectedProduct.currency}</span>
									</div>
								)}
								{selectedProduct.maxBalance !== null && selectedProduct.maxBalance !== undefined && (
									<div>
										<span className="text-gray-600">Montant maximum:</span>
										<span className="ml-2 font-semibold text-red-700">{selectedProduct.maxBalance} {selectedProduct.currency}</span>
									</div>
								)}
								{selectedProduct.defaultInterestRate !== null && selectedProduct.defaultInterestRate !== undefined && (
									<div>
										<span className="text-gray-600">Taux d'intérêt:</span>
										<span className="ml-2 font-semibold">{selectedProduct.defaultInterestRate}%</span>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Période (si applicable) */}
				{(selectedProduct?.category === "TERM_DEPOSIT" || selectedProduct?.category === "LOAN") && periods.length > 0 && (
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Période {selectedProduct.category === "TERM_DEPOSIT" ? "(Durée du dépôt)" : "(Durée du prêt)"}
							<span className="text-gray-500 font-normal text-xs ml-1">(optionnel)</span>
						</label>
						<select
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							value={form.periodId ?? ""}
							onChange={(e) => update("periodId", e.target.value ? Number(e.target.value) : undefined)}
						>
							<option value="">-- Aucune période --</option>
							{periods.map(p => (
								<option key={p.id} value={p.id}>
									{p.periodName} 
									{p.interestRate ? ` - ${p.interestRate}%` : ""}
									{p.periodDays ? ` (${p.periodDays} jours)` : ""}
								</option>
							))}
						</select>
						{selectedPeriod && (
							<div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									{selectedPeriod.interestRate && (
										<div>
											<span className="text-gray-600">Taux d'intérêt:</span>
											<span className="ml-2 font-semibold text-green-700">{selectedPeriod.interestRate}%</span>
										</div>
									)}
									{selectedPeriod.periodDays && (
										<div>
											<span className="text-gray-600">Durée:</span>
											<span className="ml-2 font-semibold">{selectedPeriod.periodDays} jours</span>
										</div>
									)}
									{selectedPeriod.minAmount && (
										<div>
											<span className="text-gray-600">Montant minimum:</span>
											<span className="ml-2 font-semibold">{selectedPeriod.minAmount} {selectedProduct?.currency}</span>
										</div>
									)}
									{selectedPeriod.maxAmount && (
										<div>
											<span className="text-gray-600">Montant maximum:</span>
											<span className="ml-2 font-semibold">{selectedPeriod.maxAmount} {selectedProduct?.currency}</span>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Montant d'ouverture */}
				<div>
					<label className="block text-sm font-semibold text-gray-900 mb-2">Montant d'ouverture</label>
					<div className="relative">
						<Input
							type="number"
							step="0.01"
							min="0"
							value={form.openingAmount ?? ""}
							onChange={(e) => update("openingAmount", e.target.value ? Number(e.target.value) : undefined)}
							placeholder="0.00"
							className="pr-16"
						/>
						{selectedProduct && (
							<div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600">
								{selectedProduct.currency}
							</div>
						)}
					</div>
					{selectedProduct && (
						<div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
							<span>Devise: <span className="font-semibold">{selectedProduct.currency}</span></span>
							{selectedProduct.minBalance !== null && (
								<span>Min: <span className="font-semibold text-green-700">{selectedProduct.minBalance}</span></span>
							)}
							{selectedProduct.maxBalance !== null && (
								<span>Max: <span className="font-semibold text-red-700">{selectedProduct.maxBalance}</span></span>
							)}
						</div>
					)}
				</div>

				{/* Devise */}
				<div>
					<label className="block text-sm font-semibold text-gray-900 mb-2">
						Devise <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
					</label>
					<Input
						value={form.currency ?? selectedProduct?.currency ?? "USD"}
						onChange={(e) => update("currency", e.target.value || undefined)}
						placeholder="USD"
						maxLength={3}
						className="uppercase"
					/>
					<p className="text-xs text-gray-500 mt-2">
						Code ISO-3 (ex: USD, EUR, XOF). Par défaut: <span className="font-medium">{selectedProduct?.currency || "USD"}</span>
					</p>
				</div>

				{/* Actions */}
				<div className="flex items-center justify-between pt-6 border-t border-gray-200">
					<Link href="/accounts">
						<Button type="button" variant="outline" className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
							Annuler
						</Button>
					</Link>
					<Button 
						type="submit" 
						disabled={loading || !form.clientId || !form.productId}
						className="min-w-[180px] flex items-center justify-center gap-2"
					>
						{loading ? (
							<>
								<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Ouverture en cours...
							</>
						) : (
							<>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Ouvrir le compte
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}

