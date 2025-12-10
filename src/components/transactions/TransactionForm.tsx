"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { transactionsApi, accountsApi, customersApi } from "@/lib/api";
import type { Account, TransactionType, CreateTransactionRequest, Customer } from "@/types";

interface TransactionFormProps {
	transactionType: TransactionType;
	title: string;
	description: string;
	icon?: React.ReactNode;
	additionalFields?: React.ReactNode;
	onSubmit?: (data: CreateTransactionRequest) => Promise<void>;
}

export default function TransactionForm({
	transactionType,
	title,
	description,
	icon,
	additionalFields,
	onSubmit
}: TransactionFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
	
	// Client selection
	const [clientSearchQuery, setClientSearchQuery] = useState("");
	const [isClientModalOpen, setIsClientModalOpen] = useState(false);
	const [selectedClientId, setSelectedClientId] = useState<number | "">("");
	
	// Récupérer accountId depuis l'URL si présent
	const accountIdParam = searchParams?.get('accountId');
	
	const [formData, setFormData] = useState<CreateTransactionRequest>({
		type: transactionType,
		accountId: accountIdParam ? parseInt(accountIdParam) : 0,
		amount: 0,
		currency: "",
		description: "",
		valueDate: new Date().toISOString().split("T")[0]
	});

	// Charger les clients
	useEffect(() => {
		async function loadCustomers() {
			try {
				const data = await customersApi.list();
				setCustomers(data.filter(c => c.status === "VERIFIED"));
			} catch (e: any) {
				console.error("Erreur lors du chargement des clients:", e);
			}
		}
		loadCustomers();
	}, []);

	// Charger les comptes du client sélectionné uniquement
	useEffect(() => {
		async function loadClientAccounts() {
			if (selectedClientId && selectedClientId !== "") {
				try {
					const data = await accountsApi.getClientAccounts(selectedClientId);
					// Filtrer uniquement les comptes ACTIVE
					const activeAccounts = data.filter((acc) => acc.status === "ACTIVE");
					setClientAccounts(activeAccounts);
					
					if (accountIdParam) {
						const accountId = parseInt(accountIdParam);
						const account = activeAccounts.find(a => a.id === accountId);
						if (account) {
							setFormData(prev => ({ ...prev, accountId }));
						} else {
							setFormData(prev => ({ ...prev, accountId: 0 }));
						}
					}
				} catch (e: any) {
					console.error("Erreur lors du chargement des comptes du client:", e);
					setClientAccounts([]);
					setFormData(prev => ({ ...prev, accountId: 0 }));
				}
			} else {
				// Aucun client sélectionné : vider la liste des comptes
				setClientAccounts([]);
				setFormData(prev => ({ ...prev, accountId: 0 }));
			}
		}
		loadClientAccounts();
	}, [selectedClientId, accountIdParam]);

	// Si accountId est dans l'URL, charger le compte et son client
	useEffect(() => {
		async function loadAccountAndClient() {
			if (accountIdParam) {
				try {
					const account = await accountsApi.get(accountIdParam);
					if (account.clientId) {
						setSelectedClientId(account.clientId);
						const clientAccounts = await accountsApi.getClientAccounts(account.clientId);
						setClientAccounts(clientAccounts.filter((acc) => acc.status === "ACTIVE"));
						setFormData(prev => ({ ...prev, accountId: account.id }));
					}
				} catch (e) {
					console.error("Erreur lors du chargement du compte:", e);
				}
			}
		}
		loadAccountAndClient();
	}, [accountIdParam]);

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

	const selectedClient = customers.find(c => c.id === selectedClientId);
	const selectedAccount = clientAccounts.find(a => a.id === formData.accountId);

	// Mettre à jour la devise automatiquement quand un compte est sélectionné
	useEffect(() => {
		if (selectedAccount && selectedAccount.currency) {
			setFormData(prev => ({
				...prev,
				currency: selectedAccount.currency
			}));
		}
	}, [selectedAccount]);

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

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!formData.accountId || formData.amount <= 0) {
			setError("Veuillez remplir tous les champs requis");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const payload: CreateTransactionRequest = {
				...formData,
				type: transactionType,
				currency: formData.currency || selectedAccount?.currency || "XAF"
			};
			
			if (onSubmit) {
				await onSubmit(payload);
			} else {
				const transaction = await transactionsApi.create(payload);
				router.push(`/transactions/${transaction.id}`);
			}
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la création de la transaction");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/transactions" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des transactions
				</Link>
				<div className="flex items-center gap-4">
					{icon || (
						<div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
						</div>
					)}
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{title}</h1>
						<p className="text-gray-600 mt-1">{description}</p>
					</div>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">Erreur</div>
						<div className="text-sm mt-1">{error}</div>
					</div>
				</div>
			)}

			{/* Formulaire */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<div>
							<h2 className="text-lg font-bold text-gray-900">Informations de la transaction</h2>
							<p className="text-xs text-gray-600">Remplissez les champs ci-dessous</p>
						</div>
					</div>
				</div>
				<form onSubmit={handleSubmit} className="p-6">
					<div className="space-y-6">
						{/* Client */}
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">
								Client <span className="text-red-500">*</span>
							</label>
							
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
														{selectedClient.email && (
															<span className="flex items-center gap-1">
																<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
																</svg>
																{selectedClient.email}
															</span>
														)}
														{selectedClient.phone && (
															<span className="flex items-center gap-1 mt-1">
																<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
																</svg>
																{selectedClient.phone}
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
													{selectedClient.status}
												</span>
											</div>
										</div>
										<div className="flex gap-2 ml-3">
											<button
												type="button"
												onClick={() => setIsClientModalOpen(true)}
												className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
											>
												Modifier
											</button>
											<button
												type="button"
												onClick={() => {
													setSelectedClientId("");
													setClientSearchQuery("");
													setClientAccounts([]);
													setFormData(prev => ({ ...prev, accountId: 0 }));
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
						</div>

						{/* Modal de recherche et sélection */}
						{isClientModalOpen && (
							<div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
								<div 
									className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
									onClick={() => {
										setIsClientModalOpen(false);
										setClientSearchQuery("");
									}}
								></div>
								<div className="flex min-h-full items-center justify-center p-4">
									<div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-2xl">
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
																	setSelectedClientId(c.id);
																	setIsClientModalOpen(false);
																	setClientSearchQuery("");
																	setFormData(prev => ({ ...prev, accountId: 0 }));
																}}
																className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors focus:outline-none focus:bg-blue-50"
															>
																<div className="flex items-start justify-between">
																	<div className="flex-1">
																		<div className="font-medium text-gray-900">{c.displayName}</div>
																		<div className="mt-1 text-sm text-gray-600 space-y-0.5">
																			{c.email && (
																				<div className="flex items-center gap-1">
																					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
																					</svg>
																					{c.email}
																				</div>
																			)}
																			{c.phone && (
																				<div className="flex items-center gap-1">
																					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
																					</svg>
																					{c.phone}
																				</div>
																			)}
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

						{/* Compte */}
						<div>
							<label className="block text-sm font-semibold text-gray-900 mb-2">
								Compte <span className="text-red-500">*</span>
							</label>
							{!selectedClientId ? (
								<div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
									<div className="flex items-start gap-2">
										<svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
										</svg>
										<p className="text-sm text-gray-700">
											Veuillez d'abord sélectionner un client pour afficher ses comptes.
										</p>
									</div>
								</div>
							) : clientAccounts.length === 0 ? (
								<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
									<div className="flex items-start gap-2">
										<svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
										</svg>
										<p className="text-sm text-yellow-800">
											Ce client n'a aucun compte actif. Veuillez d'abord ouvrir un compte pour ce client.
										</p>
									</div>
								</div>
							) : (
								<select
									value={formData.accountId}
									onChange={(e) =>
										setFormData({ ...formData, accountId: parseInt(e.target.value) })
									}
									className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
									required
								>
									<option value={0}>Sélectionner un compte du client</option>
									{clientAccounts.map((acc) => (
										<option key={acc.id} value={acc.id}>
											{acc.accountNumber} - {acc.currency} (Solde: {acc.balance.toFixed(2)})
										</option>
									))}
								</select>
							)}
							{selectedAccount && (
								<div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
									<div className="grid grid-cols-2 gap-3 text-sm">
										<div>
											<span className="text-gray-600">Solde:</span>
											<span className="ml-2 font-semibold text-gray-900">
												{selectedAccount.balance.toFixed(2)} {selectedAccount.currency}
											</span>
										</div>
										<div>
											<span className="text-gray-600">Disponible:</span>
											<span className="ml-2 font-semibold text-green-700">
												{selectedAccount.availableBalance.toFixed(2)} {selectedAccount.currency}
											</span>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Champs supplémentaires spécifiques au type */}
						{additionalFields}

						{/* Montant */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Montant *</label>
							<Input
								type="number"
								step="0.01"
								min="0.01"
								value={formData.amount || ""}
								onChange={(e) =>
									setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
								}
								required
								placeholder="0.00"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
								<Input
									type="text"
									maxLength={3}
									value={formData.currency || selectedAccount?.currency || "XAF"}
									disabled
									className="bg-gray-100 cursor-not-allowed"
									placeholder="XAF"
								/>
								{selectedAccount && (
									<p className="text-xs text-gray-500 mt-1">
										Devise du compte sélectionné
									</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Date de valeur</label>
								<Input
									type="date"
									value={formData.valueDate}
									onChange={(e) =>
										setFormData({ ...formData, valueDate: e.target.value })
									}
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
							<textarea
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								rows={3}
								placeholder="Description de la transaction..."
							/>
						</div>

						<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
							<Link href="/transactions">
								<Button type="button" variant="outline">
									Annuler
								</Button>
							</Link>
							<Button 
								type="submit" 
								disabled={loading || !selectedClientId || !formData.accountId || clientAccounts.length === 0}
								className="flex items-center gap-2"
							>
								{loading ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Création...
									</>
								) : (
									<>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
										Créer la transaction
									</>
								)}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}




