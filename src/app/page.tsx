"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardApi, accountsApi, transactionsApi } from "@/lib/api";
import type { Account, Transaction } from "@/types";
import { 
	Users, 
	Wallet, 
	Package, 
	Repeat, 
	ArrowLeftRight, 
	TrendingUp, 
	TrendingDown,
	DollarSign,
	Sparkles,
	Activity
} from "lucide-react";

export default function Dashboard() {
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<any>(null);
	const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
	const [recentAccounts, setRecentAccounts] = useState<Account[]>([]);
	const [transactionStats, setTransactionStats] = useState<any>(null);

	useEffect(() => {
		// Ne charger les données que si l'utilisateur est authentifié et que le chargement est terminé
		if (authLoading) return;
		if (!isAuthenticated) return;
		
		loadDashboard();
	}, [authLoading, isAuthenticated]);

	async function loadDashboard() {
		setLoading(true);
		try {
			const [statsData, transactionsData, accountsData, transactionStatsData] = await Promise.all([
				dashboardApi.getStats(),
				dashboardApi.getRecentTransactions(10),
				dashboardApi.getRecentAccounts(10),
				dashboardApi.getTransactionStatsByType()
			]);
			setStats(statsData);
			setRecentTransactions(transactionsData);
			setRecentAccounts(accountsData);
			setTransactionStats(transactionStatsData);
		} catch (e: any) {
			console.error("Erreur lors du chargement du dashboard:", e);
		} finally {
			setLoading(false);
		}
	}

	function formatCurrency(amount: number | string | null | undefined, currency: string = "XAF"): string {
		if (amount == null) return "0.00";
		const num = typeof amount === "string" ? parseFloat(amount) : amount;
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: currency
		}).format(num);
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat('fr-FR').format(num);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
					<p className="text-gray-600">Chargement du tableau de bord...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
				<p className="text-gray-600 mt-1">Vue d'ensemble du système bancaire</p>
			</div>

			{/* Cartes de statistiques */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{/* Comptes */}
					<div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600 mb-1">Comptes</p>
								<p className="text-3xl font-bold text-gray-900">{formatNumber(stats.accounts?.total || 0)}</p>
								<p className="text-xs text-gray-500 mt-1">
									{stats.accounts?.active || 0} actifs
								</p>
							</div>
							<div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
								<Wallet className="w-6 h-6 text-white" />
							</div>
						</div>
					</div>

					{/* Clients */}
					<div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600 mb-1">Clients</p>
								<p className="text-3xl font-bold text-gray-900">{formatNumber(stats.clients?.total || 0)}</p>
							</div>
							<div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
								<Users className="w-6 h-6 text-white" />
							</div>
						</div>
					</div>

					{/* Produits */}
					<div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600 mb-1">Produits</p>
								<p className="text-3xl font-bold text-gray-900">{formatNumber(stats.products?.total || 0)}</p>
								<p className="text-xs text-gray-500 mt-1">
									{stats.products?.active || 0} actifs
								</p>
							</div>
							<div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
								<Package className="w-6 h-6 text-white" />
							</div>
						</div>
					</div>

					{/* Transactions aujourd'hui */}
					<div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600 mb-1">Transactions (aujourd'hui)</p>
								<p className="text-3xl font-bold text-gray-900">{formatNumber(stats.transactions?.today || 0)}</p>
								<p className="text-xs text-gray-500 mt-1">
									{formatNumber(stats.transactions?.total || 0)} au total
								</p>
							</div>
							<div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
								<Activity className="w-6 h-6 text-white" />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Statistiques financières */}
			{stats?.financials && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="bg-white border rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
								<TrendingUp className="w-5 h-5 text-green-600" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Solde total</p>
								<p className="text-2xl font-bold text-gray-900">
									{formatCurrency(stats.financials.totalBalance, "XAF")}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white border rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
								<Sparkles className="w-5 h-5 text-blue-600" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Intérêts (aujourd'hui)</p>
								<p className="text-2xl font-bold text-green-600">
									{formatCurrency(stats.financials.totalInterestToday, "XAF")}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white border rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
								<DollarSign className="w-5 h-5 text-red-600" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Frais (aujourd'hui)</p>
								<p className="text-2xl font-bold text-red-600">
									{formatCurrency(stats.financials.totalFeesToday, "XAF")}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Statistiques par type de transaction */}
			{transactionStats && (
				<div className="bg-white border rounded-xl p-6 shadow-sm">
					<h2 className="text-lg font-semibold mb-4">Statistiques par type de transaction (30 derniers jours)</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{Object.entries(transactionStats).map(([type, data]: [string, any]) => (
							<div key={type} className="bg-gray-50 rounded-lg p-4">
								<p className="text-sm font-medium text-gray-600 mb-1">{type}</p>
								<p className="text-xl font-bold text-gray-900">{formatNumber(data.count || 0)}</p>
								<p className="text-xs text-gray-500 mt-1">
									{formatCurrency(data.total, "XAF")}
								</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Grille principale */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Transactions récentes */}
				<div className="bg-white border rounded-xl p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">Transactions récentes</h2>
						<Link href="/transactions" className="text-sm text-blue-600 hover:underline">
							Voir tout
						</Link>
					</div>
					{recentTransactions.length === 0 ? (
						<div className="text-center py-8 text-gray-500">Aucune transaction récente</div>
					) : (
						<div className="space-y-3">
							{recentTransactions.map((tx) => (
								<Link
									key={tx.id}
									href={`/transactions/${tx.id}`}
									className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
												tx.type === "DEPOSIT" || tx.type === "INTEREST" ? "bg-green-100" :
												tx.type === "WITHDRAWAL" || tx.type === "FEE" ? "bg-red-100" :
												"bg-blue-100"
											}`}>
												{tx.type === "DEPOSIT" || tx.type === "INTEREST" ? (
													<TrendingUp className="w-4 h-4 text-green-600" />
												) : tx.type === "WITHDRAWAL" || tx.type === "FEE" ? (
													<TrendingDown className="w-4 h-4 text-red-600" />
												) : (
													<ArrowLeftRight className="w-4 h-4 text-blue-600" />
												)}
											</div>
											<div>
												<p className="text-sm font-medium text-gray-900">{tx.type}</p>
												<p className="text-xs text-gray-500">
													{tx.description || "—"}
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className={`text-sm font-bold ${
												tx.type === "DEPOSIT" || tx.type === "INTEREST" ? "text-green-600" :
												tx.type === "WITHDRAWAL" || tx.type === "FEE" ? "text-red-600" :
												"text-gray-900"
											}`}>
												{tx.type === "DEPOSIT" || tx.type === "INTEREST" ? "+" : "-"}
												{formatCurrency(tx.amount, tx.currency)}
											</p>
											<p className="text-xs text-gray-500">
												{new Date(tx.transactionDate).toLocaleDateString("fr-FR")}
											</p>
										</div>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>

				{/* Comptes récents */}
				<div className="bg-white border rounded-xl p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">Comptes récents</h2>
						<Link href="/accounts" className="text-sm text-blue-600 hover:underline">
							Voir tout
						</Link>
					</div>
					{recentAccounts.length === 0 ? (
						<div className="text-center py-8 text-gray-500">Aucun compte récent</div>
					) : (
						<div className="space-y-3">
							{recentAccounts.map((account) => (
								<Link
									key={account.id}
									href={`/accounts/${account.id}`}
									className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
								>
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium text-gray-900">{account.accountNumber}</p>
											<p className="text-xs text-gray-500">
												{account.status} • {account.currency}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-bold text-gray-900">
												{formatCurrency(account.balance, account.currency)}
											</p>
											<p className="text-xs text-gray-500">
												{new Date(account.createdAt).toLocaleDateString("fr-FR")}
											</p>
										</div>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Actions rapides */}
			<div className="bg-white border rounded-xl p-6 shadow-sm">
				<h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Link
						href="/customers/new"
						className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
					>
						<Users className="w-8 h-8 text-blue-600 mb-2" />
						<span className="text-sm font-medium text-gray-900">Nouveau client</span>
					</Link>
					<Link
						href="/accounts/new"
						className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
					>
						<Wallet className="w-8 h-8 text-green-600 mb-2" />
						<span className="text-sm font-medium text-gray-900">Nouveau compte</span>
					</Link>
					<Link
						href="/transactions/deposit/new"
						className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
					>
						<TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
						<span className="text-sm font-medium text-gray-900">Dépôt</span>
					</Link>
					<Link
						href="/transfers/new"
						className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
					>
						<ArrowLeftRight className="w-8 h-8 text-orange-600 mb-2" />
						<span className="text-sm font-medium text-gray-900">Virement</span>
					</Link>
				</div>
			</div>
		</div>
	);
}
