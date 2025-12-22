"use client";

import { useState, useEffect } from "react";
import TransactionForm from "@/components/transactions/TransactionForm";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { accountsApi, customersApi } from "@/lib/api";
import type { Account, CreateTransactionRequest, CreateTransferRequest, Customer } from "@/types";

export default function NewTransferPage() {
	const [destinationAccountId, setDestinationAccountId] = useState<number>(0);
	const [destinationAccounts, setDestinationAccounts] = useState<Account[]>([]);
	const [destinationAccount, setDestinationAccount] = useState<Account | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [toClientId, setToClientId] = useState<number>(0);
	const [toClient, setToClient] = useState<Customer | null>(null);
	const [toClientSearch, setToClientSearch] = useState("");
	const [showToClientModal, setShowToClientModal] = useState(false);
	const [fromAccountId, setFromAccountId] = useState<number>(0);

	useEffect(() => {
		async function loadCustomers() {
			try {
				const response = await customersApi.list({ status: "VERIFIED", size: 1000 }); // Load all verified customers
				setCustomers(response.content);
			} catch (e) {
				console.error("Erreur lors du chargement des clients:", e);
			}
		}
		loadCustomers();
	}, []);

	useEffect(() => {
		async function loadAccounts() {
			try {
				const data = await accountsApi.list();
				setDestinationAccounts(data.filter((acc) => acc.status === "ACTIVE"));
			} catch (e) {
				console.error("Erreur lors du chargement des comptes:", e);
			}
		}
		loadAccounts();
	}, []);

	useEffect(() => {
		if (toClientId) {
			const client = customers.find(c => c.id === toClientId);
			setToClient(client || null);
			setShowToClientModal(false);
			
			// Charger les comptes du client destinataire
			async function loadClientAccounts() {
				try {
					const data = await accountsApi.getClientAccounts(toClientId);
					let filtered = data.filter((acc) => acc.status === "ACTIVE");
					
					// Filtrer par devise si un compte source est sélectionné
					if (fromAccountId) {
						try {
							const fromAcc = await accountsApi.get(fromAccountId);
							if (fromAcc) {
								filtered = filtered.filter(acc => acc.currency === fromAcc.currency);
							}
						} catch (e) {
							console.error("Erreur lors du chargement du compte source:", e);
						}
					}
					setDestinationAccounts(filtered);
					// Réinitialiser la sélection SEULEMENT si le compte sélectionné n'est plus dans la liste
					// Ne pas réinitialiser si prev est déjà 0 pour éviter de réinitialiser une nouvelle sélection
					setDestinationAccountId(prev => {
						if (prev === 0) return 0; // Garder 0 si déjà à 0
						const stillExists = filtered.some(acc => acc.id === prev);
						if (!stillExists && filtered.length > 0) {
							// Seulement réinitialiser si la liste est chargée et le compte n'existe plus
							console.log('Account no longer in list, resetting');
							return 0;
						}
						return prev; // Garder la valeur actuelle
					});
				} catch (e) {
					console.error("Erreur lors du chargement des comptes du client:", e);
				}
			}
			loadClientAccounts();
		} else {
			setToClient(null);
			setDestinationAccountId(0);
			setDestinationAccount(null);
			// Recharger tous les comptes si aucun client n'est sélectionné
			async function loadAllAccounts() {
				try {
					const data = await accountsApi.list();
					let filtered = data.filter((acc) => acc.status === "ACTIVE");
					
					// Filtrer par devise si un compte source est sélectionné
					if (fromAccountId) {
						try {
							const fromAcc = await accountsApi.get(fromAccountId);
							if (fromAcc) {
								filtered = filtered.filter(acc => acc.currency === fromAcc.currency);
							}
						} catch (e) {
							console.error("Erreur lors du chargement du compte source:", e);
						}
					}
					setDestinationAccounts(filtered);
				} catch (e) {
					console.error("Erreur lors du chargement des comptes:", e);
				}
			}
			loadAllAccounts();
		}
	}, [toClientId, customers, fromAccountId]);

	useEffect(() => {
		if (destinationAccountId) {
			const account = destinationAccounts.find(a => a.id === destinationAccountId);
			setDestinationAccount(account || null);
		} else {
			setDestinationAccount(null);
		}
	}, [destinationAccountId, destinationAccounts]);

	// Surveiller les changements du compte source dans le formulaire
	useEffect(() => {
		const checkAccountId = () => {
			// Chercher le select du compte avec l'attribut data-account-select
			const accountSelect = document.querySelector('select[data-account-select="true"]') as HTMLSelectElement;
			if (accountSelect) {
				const value = accountSelect.value ? parseInt(accountSelect.value) : 0;
				if (value !== fromAccountId) {
					setFromAccountId(value);
				}
			}
		};
		
		// Vérifier immédiatement après le rendu
		const timeoutId = setTimeout(checkAccountId, 100);
		
		// Écouter l'événement personnalisé accountSelected
		const handleAccountSelected = (e: CustomEvent) => {
			const accountId = e.detail?.accountId || 0;
			if (accountId !== fromAccountId) {
				setFromAccountId(accountId);
			}
		};
		
		window.addEventListener('accountSelected', handleAccountSelected as EventListener);
		
		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener('accountSelected', handleAccountSelected as EventListener);
		};
	}, [fromAccountId]);

	return (
		<TransactionForm
			transactionType="TRANSFER"
			title="Nouveau virement"
			description="Effectuer un virement entre deux comptes"
			icon={
				<div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
					<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
					</svg>
				</div>
			}
			additionalFields={
				<>
					{/* Destinataire */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Destinataire <span className="text-red-500">*</span>
						</label>
						
						{!fromAccountId ? (
							<Button
								type="button"
								variant="outline"
								disabled
								className="w-full justify-start h-12 border-2 border-dashed border-gray-300 cursor-not-allowed"
							>
								<svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								Sélectionnez d'abord le compte émetteur
							</Button>
						) : !toClient ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setShowToClientModal(true);
									setToClientSearch("");
								}}
								className="w-full justify-start h-12 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
							>
								<svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								Rechercher et sélectionner destinataire
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
												<div className="text-sm font-semibold text-gray-900">{toClient.displayName}</div>
												<div className="text-xs text-gray-600 mt-0.5">
													{toClient.email && (
														<span className="flex items-center gap-1">
															<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
															</svg>
															{toClient.email}
														</span>
													)}
													{toClient.phone && (
														<span className="flex items-center gap-1 mt-1">
															<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
															</svg>
															{toClient.phone}
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
												{toClient.status}
											</span>
										</div>
									</div>
									<div className="flex gap-2 ml-3">
										<button
											type="button"
											onClick={() => {
												setShowToClientModal(true);
												setToClientSearch("");
											}}
											className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
										>
											Modifier
										</button>
										<button
											type="button"
											onClick={() => {
												setToClientId(0);
												setToClient(null);
												setDestinationAccounts([]);
												setDestinationAccountId(0);
												setDestinationAccount(null);
												setToClientSearch("");
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

					{/* Modal de recherche de destinataire */}
					{showToClientModal && (
						<div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
							<div 
								className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
								onClick={() => {
									setShowToClientModal(false);
									setToClientSearch("");
								}}
							></div>
							<div className="flex min-h-full items-center justify-center p-4">
								<div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-2xl">
									<div className="px-6 py-4 border-b border-gray-200">
										<div className="flex items-center justify-between">
											<h3 className="text-lg font-semibold text-gray-900">Rechercher un destinataire</h3>
											<button
												type="button"
												onClick={() => {
													setShowToClientModal(false);
													setToClientSearch("");
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
													value={toClientSearch}
													onChange={(e) => setToClientSearch(e.target.value)}
													className="w-full pl-10"
													autoFocus
												/>
												<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
													<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
													</svg>
												</div>
												{toClientSearch && (
													<button
														type="button"
														onClick={() => setToClientSearch("")}
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
											{(() => {
												const filtered = customers.filter((client) => {
													if (!toClientSearch.trim()) return true;
													const searchLower = toClientSearch.toLowerCase();
													return (
														client.displayName?.toLowerCase().includes(searchLower) ||
														client.email?.toLowerCase().includes(searchLower) ||
														client.phone?.toLowerCase().includes(searchLower)
													);
												});
												
												if (filtered.length === 0) {
													return (
														<div className="p-8 text-center text-gray-500">
															{toClientSearch ? (
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
													);
												}
												
												return (
													<div className="divide-y divide-gray-200">
														{filtered.map((client) => (
															<button
																key={client.id}
																type="button"
																onClick={() => {
																	setToClientId(client.id);
																	setShowToClientModal(false);
																	setToClientSearch("");
																}}
																className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors focus:outline-none focus:bg-blue-50"
															>
																<div className="flex items-start justify-between">
																	<div className="flex-1">
																		<div className="font-medium text-gray-900">{client.displayName}</div>
																		<div className="mt-1 text-sm text-gray-600 space-y-0.5">
																			{client.email && (
																				<div className="flex items-center gap-1">
																					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
																					</svg>
																					{client.email}
																				</div>
																			)}
																			{client.phone && (
																				<div className="flex items-center gap-1">
																					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
																					</svg>
																					{client.phone}
																				</div>
																			)}
																		</div>
																	</div>
																	<div className="ml-4">
																		<span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
																			✓ {client.status}
																		</span>
																	</div>
																</div>
															</button>
														))}
													</div>
												);
											})()}
										</div>
									</div>
									<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
										<div className="flex justify-end">
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setShowToClientModal(false);
													setToClientSearch("");
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

					{/* Compte destinataire */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Compte destinataire <span className="text-red-500">*</span>
						</label>
						<select
							key={`dest-account-${toClientId}-${destinationAccounts.length}`}
							value={destinationAccountId > 0 ? String(destinationAccountId) : "0"}
							onChange={(e) => {
								const selectedValue = e.target.value;
								const value = selectedValue === "0" ? 0 : parseInt(selectedValue);
								console.log('Destination account select onChange:', { selectedValue, value, currentId: destinationAccountId });
								
								// Mettre à jour l'état de manière synchrone
								setDestinationAccountId(value);
								
								// Trouver et mettre à jour le compte sélectionné
								if (value > 0) {
									const account = destinationAccounts.find(a => a.id === value);
									console.log('Setting destination account:', account);
									setDestinationAccount(account || null);
								} else {
									setDestinationAccount(null);
								}
							}}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
							required
							disabled={!toClientId || destinationAccounts.length === 0}
						>
							<option value="0">
								{!toClientId 
									? "Sélectionnez d'abord le client destinataire"
									: destinationAccounts.length === 0
									? "Aucun compte disponible"
									: "Sélectionner le compte destinataire"}
							</option>
							{destinationAccounts.map((acc) => (
								<option key={`acc-${acc.id}`} value={String(acc.id)}>
									{acc.accountNumber} - {acc.currency} (Solde: {acc.balance.toFixed(2)})
								</option>
							))}
						</select>
						{destinationAccount && (
							<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Compte:</span>
										<span className="ml-2 font-semibold text-gray-900">
											{destinationAccount.accountNumber}
										</span>
									</div>
									<div>
										<span className="text-gray-600">Solde:</span>
										<span className="ml-2 font-semibold text-green-700">
											{destinationAccount.balance.toFixed(2)} {destinationAccount.currency}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</>
			}
			onSubmit={async (data: CreateTransactionRequest) => {
				// Pour un virement, on utilise l'endpoint dédié /api/transfers
				const { transfersApi } = await import("@/lib/api");
				const transfer = await transfersApi.create({
					fromAccountId: data.accountId,
					toAccountId: destinationAccountId,
					amount: data.amount,
					currency: data.currency,
					description: data.description,
					valueDate: data.valueDate,
					reference: data.metadata
				});
				// Rediriger vers la transaction de débit associée au transfert
				if (transfer.fromTransactionId) {
					window.location.href = `/transactions/${transfer.fromTransactionId}`;
				} else {
					// Fallback: rediriger vers la liste des transactions si l'ID n'est pas encore disponible
					window.location.href = `/transactions`;
				}
			}}
		/>
	);
}




