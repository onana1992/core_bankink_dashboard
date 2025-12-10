"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { transfersApi, accountsApi, customersApi } from "@/lib/api";
import type { Account, CreateTransferRequest, Customer } from "@/types";

export default function NewTransferPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	
	// Form state
	const [fromClientId, setFromClientId] = useState<number>(0);
	const [fromAccountId, setFromAccountId] = useState<number>(0);
	const [toClientId, setToClientId] = useState<number>(0);
	const [toAccountId, setToAccountId] = useState<number>(0);
	const [amount, setAmount] = useState("");
	const [currency, setCurrency] = useState("");
	const [description, setDescription] = useState("");
	const [reference, setReference] = useState("");
	const [valueDate, setValueDate] = useState("");

	const [fromClient, setFromClient] = useState<Customer | null>(null);
	const [fromClientAccounts, setFromClientAccounts] = useState<Account[]>([]);
	const [fromAccount, setFromAccount] = useState<Account | null>(null);
	const [toClient, setToClient] = useState<Customer | null>(null);
	const [toClientAccounts, setToClientAccounts] = useState<Account[]>([]);
	const [toAccount, setToAccount] = useState<Account | null>(null);
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);

	useEffect(() => {
		async function loadCustomers() {
			try {
				const data = await customersApi.list();
				setCustomers(data.filter((c) => c.status === "VERIFIED"));
			} catch (e) {
				console.error("Erreur lors du chargement des clients:", e);
			}
		}
		loadCustomers();
	}, []);

	useEffect(() => {
		if (fromClientId) {
			const client = customers.find((c) => c.id === fromClientId);
			setFromClient(client || null);
			setFromAccountId(0);
			setFromAccount(null);
			
			// Charger les comptes du client émetteur
			async function loadClientAccounts() {
				try {
					const data = await accountsApi.getClientAccounts(fromClientId);
					setFromClientAccounts(data.filter((acc) => acc.status === "ACTIVE"));
				} catch (e) {
					console.error("Erreur lors du chargement des comptes du client:", e);
					setFromClientAccounts([]);
				}
			}
			loadClientAccounts();
		} else {
			setFromClient(null);
			setFromClientAccounts([]);
			setFromAccountId(0);
			setFromAccount(null);
		}
	}, [fromClientId, customers]);

	useEffect(() => {
		if (fromAccountId && fromClientAccounts.length > 0) {
			const account = fromClientAccounts.find((a) => a.id === fromAccountId);
			setFromAccount(account || null);
			if (account) {
				setCurrency(account.currency);
				// Réinitialiser le destinataire si la devise change
				if (toAccount && toAccount.currency !== account.currency) {
					setToClientId(0);
					setToAccountId(0);
				}
			}
		} else {
			setFromAccount(null);
		}
	}, [fromAccountId, fromClientAccounts]);

	useEffect(() => {
		if (toClientId) {
			const client = customers.find((c) => c.id === toClientId);
			setToClient(client || null);
			setToAccountId(0);
			setToAccount(null);
			
			// Charger les comptes du client destinataire
			async function loadClientAccounts() {
				try {
					const data = await accountsApi.getClientAccounts(toClientId);
					// Filtrer par devise si un compte source est sélectionné
					const filtered = data.filter((acc) => {
						if (acc.status !== "ACTIVE") return false;
						if (fromAccount && acc.currency !== fromAccount.currency) return false;
						return true;
					});
					setToClientAccounts(filtered);
				} catch (e) {
					console.error("Erreur lors du chargement des comptes du client:", e);
					setToClientAccounts([]);
				}
			}
			loadClientAccounts();
		} else {
			setToClient(null);
			setToClientAccounts([]);
			setToAccountId(0);
			setToAccount(null);
		}
	}, [toClientId, customers, fromAccount]);

	useEffect(() => {
		if (toAccountId && toClientAccounts.length > 0) {
			const account = toClientAccounts.find((a) => a.id === toAccountId);
			setToAccount(account || null);
		} else {
			setToAccount(null);
		}
	}, [toAccountId, toClientAccounts]);

	// Calculer les frais estimés (simplifié - en production, on appellerait une API)
	useEffect(() => {
		if (fromAccount && amount && parseFloat(amount) > 0) {
			// Estimation simplifiée : 0.5% du montant, minimum 0, maximum 100
			const amountNum = parseFloat(amount);
			const fee = Math.min(Math.max(amountNum * 0.005, 0), 100);
			setEstimatedFee(fee);
		} else {
			setEstimatedFee(null);
		}
	}, [fromAccount, amount]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		if (!fromClientId || !fromAccountId || !toClientId || !toAccountId) {
			setError("Veuillez sélectionner le client émetteur, son compte, le client destinataire et son compte");
			setLoading(false);
			return;
		}

		if (fromAccountId === toAccountId) {
			setError("Le compte source et le compte destination doivent être différents");
			setLoading(false);
			return;
		}

		if (!amount || parseFloat(amount) <= 0) {
			setError("Le montant doit être supérieur à 0");
			setLoading(false);
			return;
		}

		try {
			const payload: CreateTransferRequest = {
				fromAccountId,
				toAccountId,
				amount: parseFloat(amount),
				currency: currency || undefined,
				description: description || undefined,
				reference: reference || undefined,
				valueDate: valueDate || undefined
			};

			const transfer = await transfersApi.create(payload);
			router.push(`/transfers/${transfer.id}`);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la création du transfert");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* En-tête */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Nouveau transfert interne</h1>
				<p className="text-gray-600 mt-1">Effectuer un virement entre deux comptes internes</p>
			</div>

			{/* Formulaire */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
				<form onSubmit={handleSubmit} className="space-y-6">
					{error && (
						<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							{error}
						</div>
					)}

					{/* Client émetteur */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Client émetteur <span className="text-red-500">*</span>
						</label>
						<select
							value={fromClientId}
							onChange={(e) => setFromClientId(parseInt(e.target.value))}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							required
						>
							<option value={0}>Sélectionner le client émetteur</option>
							{customers.map((client) => (
								<option key={client.id} value={client.id}>
									{client.displayName} {client.email ? `(${client.email})` : ""}
								</option>
							))}
						</select>
						{fromClient && (
							<div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Client:</span>
										<span className="ml-2 font-semibold text-gray-900">{fromClient.displayName}</span>
									</div>
									{fromClient.email && (
										<div>
											<span className="text-gray-600">Email:</span>
											<span className="ml-2 font-semibold text-gray-700">{fromClient.email}</span>
										</div>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Compte émetteur */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Compte émetteur <span className="text-red-500">*</span>
						</label>
						<select
							value={fromAccountId}
							onChange={(e) => setFromAccountId(parseInt(e.target.value))}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							required
							disabled={!fromClientId}
						>
							<option value={0}>Sélectionner le compte émetteur</option>
							{fromClientAccounts.map((acc) => (
								<option key={acc.id} value={acc.id}>
									{acc.accountNumber} - {acc.currency} (Solde: {acc.balance.toFixed(2)})
								</option>
							))}
						</select>
						{fromAccount && (
							<div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Compte:</span>
										<span className="ml-2 font-semibold text-gray-900">{fromAccount.accountNumber}</span>
									</div>
									<div>
										<span className="text-gray-600">Solde disponible:</span>
										<span className="ml-2 font-semibold text-blue-700">
											{fromAccount.balance.toFixed(2)} {fromAccount.currency}
										</span>
									</div>
								</div>
							</div>
						)}
						{fromClientId && fromClientAccounts.length === 0 && (
							<div className="mt-2 text-sm text-yellow-600">
								Ce client n'a aucun compte actif
							</div>
						)}
					</div>

					{/* Client destinataire */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Client destinataire <span className="text-red-500">*</span>
						</label>
						<select
							value={toClientId}
							onChange={(e) => setToClientId(parseInt(e.target.value))}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							required
							disabled={!fromAccountId}
						>
							<option value={0}>Sélectionner le client destinataire</option>
							{customers
								.filter((client) => client.id !== fromClientId)
								.map((client) => (
									<option key={client.id} value={client.id}>
										{client.displayName} {client.email ? `(${client.email})` : ""}
									</option>
								))}
						</select>
						{toClient && (
							<div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Client:</span>
										<span className="ml-2 font-semibold text-gray-900">{toClient.displayName}</span>
									</div>
									{toClient.email && (
										<div>
											<span className="text-gray-600">Email:</span>
											<span className="ml-2 font-semibold text-gray-700">{toClient.email}</span>
										</div>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Compte destination */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Compte destination <span className="text-red-500">*</span>
						</label>
						<select
							value={toAccountId}
							onChange={(e) => setToAccountId(parseInt(e.target.value))}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							required
							disabled={!toClientId}
						>
							<option value={0}>Sélectionner le compte destination</option>
							{toClientAccounts
								.filter((acc) => acc.id !== fromAccountId && acc.currency === (fromAccount?.currency || ""))
								.map((acc) => (
									<option key={acc.id} value={acc.id}>
										{acc.accountNumber} - {acc.currency} (Solde: {acc.balance.toFixed(2)})
									</option>
								))}
						</select>
						{toAccount && (
							<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<span className="text-gray-600">Compte:</span>
										<span className="ml-2 font-semibold text-gray-900">{toAccount.accountNumber}</span>
									</div>
									<div>
										<span className="text-gray-600">Solde actuel:</span>
										<span className="ml-2 font-semibold text-green-700">
											{toAccount.balance.toFixed(2)} {toAccount.currency}
										</span>
									</div>
								</div>
							</div>
						)}
						{toClientId && toClientAccounts.length === 0 && (
							<div className="mt-2 text-sm text-yellow-600">
								{fromAccount 
									? `Ce client n'a aucun compte actif dans la devise ${fromAccount.currency}`
									: "Ce client n'a aucun compte actif"}
							</div>
						)}
					</div>

					{/* Montant */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							Montant <span className="text-red-500">*</span>
						</label>
						<Input
							type="number"
							step="0.01"
							min="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							required
							disabled={!fromAccountId}
						/>
						{fromAccount && amount && parseFloat(amount) > 0 && (
							<div className="mt-2 text-sm text-gray-600">
								<span>Devise: </span>
								<span className="font-semibold">{fromAccount.currency}</span>
								{estimatedFee !== null && (
									<>
										<span className="ml-4">Frais estimés: </span>
										<span className="font-semibold text-orange-600">
											{estimatedFee.toFixed(2)} {fromAccount.currency}
										</span>
									</>
								)}
								{fromAccount && (
									<>
										<span className="ml-4">Total requis: </span>
										<span className="font-semibold text-red-600">
											{(parseFloat(amount) + (estimatedFee || 0)).toFixed(2)} {fromAccount.currency}
										</span>
									</>
								)}
							</div>
						)}
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
						<Input
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Description du transfert (optionnel)"
							maxLength={500}
						/>
					</div>

					{/* Référence */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">Référence</label>
						<Input
							type="text"
							value={reference}
							onChange={(e) => setReference(e.target.value)}
							placeholder="Référence externe (optionnel)"
							maxLength={255}
						/>
					</div>

					{/* Date de valeur */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">Date de valeur</label>
						<Input
							type="date"
							value={valueDate}
							onChange={(e) => setValueDate(e.target.value)}
						/>
						<p className="mt-1 text-sm text-gray-500">Laisser vide pour utiliser la date du jour</p>
					</div>

					{/* Actions */}
					<div className="flex gap-4 pt-4 border-t border-gray-200">
						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
							disabled={loading}
						>
							Annuler
						</Button>
						<Button type="submit" disabled={loading} className="flex-1">
							{loading ? (
								<>
									<div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
									Crée en cours...
								</>
							) : (
								<>
									<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
									</svg>
									Créer le transfert
								</>
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

