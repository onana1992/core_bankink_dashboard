"use client";

import { useState, useEffect, ReactNode } from "react";
import { accountsApi, customersApi, transactionsApi } from "@/lib/api";
import type { Account, CreateTransactionRequest, Customer, TransactionType } from "@/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface TransactionFormProps {
	transactionType: TransactionType;
	title: string;
	description: string;
	icon: ReactNode;
	additionalFields?: ReactNode;
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
	const [clientId, setClientId] = useState<number>(0);
	const [client, setClient] = useState<Customer | null>(null);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
	const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
	const [amount, setAmount] = useState<string>("");
	const [currency, setCurrency] = useState<string>("");
	const [descriptionText, setDescriptionText] = useState<string>("");
	const [valueDate, setValueDate] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	// Client search modal state
	const [showClientModal, setShowClientModal] = useState(false);
	const [clientSearch, setClientSearch] = useState("");
	const [customers, setCustomers] = useState<Customer[]>([]);

	// Load customers for search
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

	// Load accounts when client is selected
	useEffect(() => {
		async function loadAccounts() {
			if (clientId) {
				try {
					const data = await accountsApi.getClientAccounts(clientId);
					const filtered = data.filter((acc) => acc.status === "ACTIVE");
					setAccounts(filtered);
					
					// Reset selection if current account is not in the list
					if (selectedAccountId && !filtered.some(a => a.id === selectedAccountId)) {
						setSelectedAccountId(0);
						setSelectedAccount(null);
						setCurrency("");
					}
				} catch (e) {
					console.error("Erreur lors du chargement des comptes:", e);
					setAccounts([]);
				}
			} else {
				// Load all accounts if no client selected
				try {
					const data = await accountsApi.list();
					const filtered = data.filter((acc) => acc.status === "ACTIVE");
					setAccounts(filtered);
				} catch (e) {
					console.error("Erreur lors du chargement des comptes:", e);
					setAccounts([]);
				}
			}
		}
		loadAccounts();
	}, [clientId]);

	// Update selected account and currency when account changes
	useEffect(() => {
		if (selectedAccountId) {
			const account = accounts.find(a => a.id === selectedAccountId);
			if (account) {
				setSelectedAccount(account);
				setCurrency(account.currency);
			} else {
				setSelectedAccount(null);
			}
		} else {
			setSelectedAccount(null);
		}
	}, [selectedAccountId, accounts]);

	// Set default value date to today
	useEffect(() => {
		const today = new Date().toISOString().split('T')[0];
		setValueDate(today);
	}, []);

	// Dispatch account selected event for parent components
	useEffect(() => {
		if (selectedAccountId) {
			const event = new CustomEvent('accountSelected', {
				detail: { accountId: selectedAccountId }
			});
			window.dispatchEvent(event);
		}
	}, [selectedAccountId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		if (!selectedAccountId) {
			setError("Veuillez sélectionner un compte");
			setLoading(false);
			return;
		}

		if (!amount || parseFloat(amount) <= 0) {
			setError("Veuillez saisir un montant valide");
			setLoading(false);
			return;
		}

		if (!currency) {
			setError("Veuillez sélectionner une devise");
			setLoading(false);
			return;
		}

		try {
			const data: CreateTransactionRequest = {
				type: transactionType,
				accountId: selectedAccountId,
				amount: parseFloat(amount),
				currency: currency,
				description: descriptionText || undefined,
				valueDate: valueDate || undefined
			};

			if (onSubmit) {
				await onSubmit(data);
			} else {
				// Default submission
				const transaction = await transactionsApi.create(data);
				window.location.href = `/transactions/${transaction.id}`;
			}
		} catch (e: any) {
			setError(e?.message || "Erreur lors de la création de la transaction");
			setLoading(false);
		}
	};

	const filteredCustomers = customers.filter((customer) => {
		if (!clientSearch.trim()) return true;
		const searchLower = clientSearch.toLowerCase();
		return (
			customer.displayName?.toLowerCase().includes(searchLower) ||
			customer.email?.toLowerCase().includes(searchLower) ||
			customer.phone?.toLowerCase().includes(searchLower)
		);
	});

	return (
		<div className="max-w-4xl mx-auto">
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
					<div className="flex items-center gap-4">
						{icon}
						<div className="flex-1">
							<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
							<p className="text-sm text-gray-600 mt-1">{description}</p>
						</div>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-6">
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

					{/* Client Selection */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Client <span className="text-red-500">*</span>
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
												{client.status}
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
											Modifier
										</button>
										<button
											type="button"
											onClick={() => {
												setClientId(0);
												setClient(null);
												setSelectedAccountId(0);
												setSelectedAccount(null);
												setCurrency("");
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

					{/* Account Selection */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Compte <span className="text-red-500">*</span>
						</label>
						<select
							data-account-select="true"
							value={selectedAccountId > 0 ? String(selectedAccountId) : "0"}
							onChange={(e) => {
								const value = e.target.value === "0" ? 0 : parseInt(e.target.value);
								setSelectedAccountId(value);
							}}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
							required
							disabled={accounts.length === 0}
						>
							<option value="0">
								{accounts.length === 0
									? "Aucun compte disponible"
									: "Sélectionner un compte"}
							</option>
							{accounts.map((acc) => (
								<option key={acc.id} value={String(acc.id)}>
									{acc.accountNumber} - {acc.currency} (Solde: {acc.balance.toFixed(2)})
								</option>
							))}
						</select>
						{selectedAccount && (
							<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Compte:</span>
										<span className="ml-2 font-semibold text-gray-900">
											{selectedAccount.accountNumber}
										</span>
									</div>
									<div>
										<span className="text-gray-600">Solde:</span>
										<span className="ml-2 font-semibold text-green-700">
											{selectedAccount.balance.toFixed(2)} {selectedAccount.currency}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Additional Fields */}
					{additionalFields}

					{/* Amount */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Montant <span className="text-red-500">*</span>
						</label>
						<Input
							type="number"
							step="0.01"
							min="0"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							required
							className="w-full"
						/>
					</div>

					{/* Currency */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Devise <span className="text-red-500">*</span>
						</label>
						<Input
							type="text"
							value={currency}
							onChange={(e) => setCurrency(e.target.value)}
							placeholder="XAF"
							required
							disabled={!!selectedAccount}
							className="w-full"
						/>
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Description
						</label>
						<Input
							type="text"
							value={descriptionText}
							onChange={(e) => setDescriptionText(e.target.value)}
							placeholder="Description de la transaction"
							className="w-full"
						/>
					</div>

					{/* Value Date */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Date de valeur
						</label>
						<Input
							type="date"
							value={valueDate}
							onChange={(e) => setValueDate(e.target.value)}
							className="w-full"
						/>
					</div>

					{/* Submit Button */}
					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<Button
							type="button"
							variant="outline"
							onClick={() => window.history.back()}
							disabled={loading}
						>
							Annuler
						</Button>
						<Button
							type="submit"
							disabled={loading || !selectedAccountId || !amount || !currency}
						>
							{loading ? "Création..." : "Créer la transaction"}
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
									<h3 className="text-lg font-semibold text-gray-900">Rechercher un client</h3>
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
											placeholder="Rechercher par nom, email, téléphone..."
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
											{filteredCustomers.map((customer) => (
												<button
													key={customer.id}
													type="button"
													onClick={() => {
														setClientId(customer.id);
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
																✓ {customer.status}
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
										Fermer
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
