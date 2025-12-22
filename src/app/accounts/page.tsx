"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { accountsApi, customersApi, productsApi } from "@/lib/api";
import type { Account, AccountStatus, Customer, Product } from "@/types";

export default function AccountsPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [products, setProducts] = useState<Product[]>([]);

	// Filtres
	const [q, setQ] = useState("");
	const [filterStatus, setFilterStatus] = useState<"ALL" | AccountStatus>("ALL");
	const [filterClientId, setFilterClientId] = useState<number | null>(null);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const [accountsData, customersResponse, productsData] = await Promise.all([
				accountsApi.list(filterClientId ? { clientId: filterClientId } : undefined),
				customersApi.list({ size: 1000 }), // Load all customers
				productsApi.list()
			]);
			const customersData = customersResponse.content;
			
			// Enrichir les comptes avec les informations des produits
			const enrichedAccounts = accountsData.map(account => {
				if (account.productId && !account.product) {
					const product = productsData.find(p => p.id === account.productId);
					if (product) {
						return {
							...account,
							product: {
								id: product.id,
								code: product.code,
								name: product.name,
								category: product.category
							}
						};
					}
				}
				return account;
			});
			
			setAccounts(enrichedAccounts);
			setCustomers(customersData);
			setProducts(productsData);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des comptes");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [filterClientId]);

	const stats = useMemo(() => {
		const total = accounts.length;
		const by: Record<string, number> = {};
		for (const a of accounts) {
			by[a.status] = (by[a.status] ?? 0) + 1;
		}
		return {
			total,
			active: by["ACTIVE"] ?? 0,
			closed: by["CLOSED"] ?? 0,
			frozen: by["FROZEN"] ?? 0,
			suspended: by["SUSPENDED"] ?? 0
		};
	}, [accounts]);

	const filtered = useMemo(() => {
		let result = accounts;
		
		// Filtre par recherche
		if (q.trim()) {
			const query = q.toLowerCase();
			result = result.filter(a => 
				a.accountNumber.toLowerCase().includes(query) ||
				a.client?.displayName?.toLowerCase().includes(query) ||
				a.product?.name?.toLowerCase().includes(query)
			);
		}
		
		// Filtre par statut
		if (filterStatus !== "ALL") {
			result = result.filter(a => a.status === filterStatus);
		}
		
		return result;
	}, [accounts, q, filterStatus]);

	function getStatusBadge(status: AccountStatus) {
		const colors: Record<AccountStatus, string> = {
			ACTIVE: "bg-green-100 text-green-800",
			CLOSED: "bg-gray-100 text-gray-800",
			FROZEN: "bg-red-100 text-red-800",
			SUSPENDED: "bg-yellow-100 text-yellow-800"
		};
		const labels: Record<AccountStatus, string> = {
			ACTIVE: "Actif",
			CLOSED: "Fermé",
			FROZEN: "Gelé",
			SUSPENDED: "Suspendu"
		};
		return <Badge className={colors[status]}>{labels[status]}</Badge>;
	}

	function formatCurrency(amount: number, currency: string) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: currency
		}).format(amount);
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Comptes Clients</h1>
					<p className="text-gray-600 mt-1">Gestion et suivi des comptes bancaires</p>
				</div>
				<div className="flex gap-3">
					<Link href="/accounts/search">
						<Button variant="outline" className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
							Rechercher
						</Button>
					</Link>
					<Link href="/accounts/new">
						<Button className="flex items-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							Ouvrir un compte
						</Button>
					</Link>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">Total</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">Actifs</div>
							<div className="text-3xl font-bold text-green-900">{stats.active}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-gray-700 mb-1">Fermés</div>
							<div className="text-3xl font-bold text-gray-900">{stats.closed}</div>
						</div>
						<div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">Gelés</div>
							<div className="text-3xl font-bold text-red-900">{stats.frozen}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">Suspendus</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.suspended}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Filtres */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
						<div className="relative">
							<Input
								placeholder="Numéro, client ou produit..."
								value={q}
								onChange={(e) => setQ(e.target.value)}
								className="pl-10"
							/>
							<svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value as "ALL" | AccountStatus)}
						>
							<option value="ALL">Tous les statuts</option>
							<option value="ACTIVE">Actif</option>
							<option value="CLOSED">Fermé</option>
							<option value="FROZEN">Gelé</option>
							<option value="SUSPENDED">Suspendu</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterClientId ?? ""}
							onChange={(e) => setFilterClientId(e.target.value ? Number(e.target.value) : null)}
						>
							<option value="">Tous les clients</option>
							{customers.map(c => (
								<option key={c.id} value={c.id}>{c.displayName}</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement des comptes...</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">Aucun compte trouvé</p>
					<p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres de recherche</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Numéro</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Produit</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Solde</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Disponible</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Devise</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filtered.map(account => (
									<tr key={account.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Link href={`/accounts/${account.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium">
												{account.accountNumber}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{account.clientId ? (
												<Link href={`/customers/${account.clientId}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium">
													{account.clientId}
												</Link>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{account.product?.code ? (
												<Link href={`/products/${account.productId}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono">
													{account.product.code}
												</Link>
											) : account.product?.name ? (
												<Link href={`/products/${account.productId}`} className="text-blue-600 hover:text-blue-800 hover:underline">
													{account.product.name}
												</Link>
											) : account.productId ? (
												<Link href={`/products/${account.productId}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-gray-600">
													ID: {account.productId}
												</Link>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{getStatusBadge(account.status)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap font-mono text-right font-semibold">
											{formatCurrency(account.balance, account.currency)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap font-mono text-right font-medium text-gray-700">
											{formatCurrency(account.availableBalance, account.currency)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
												{account.currency}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/accounts/${account.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													Voir
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{filtered.length > 0 && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								Affichage de <span className="font-semibold">{filtered.length}</span> compte{filtered.length > 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

