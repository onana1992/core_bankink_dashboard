"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { chartOfAccountsApi } from "@/lib/api";
import type { ChartOfAccount, AccountType } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
	ASSET: "Actif",
	LIABILITY: "Passif",
	EQUITY: "Capitaux",
	REVENUE: "Produit",
	EXPENSE: "Charge"
};

export default function ChartOfAccountsPage() {
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [q, setQ] = useState("");
	const [filterType, setFilterType] = useState<"ALL" | AccountType>("ALL");
	const [filterActive, setFilterActive] = useState<"ALL" | boolean>("ALL");

	const loadAccounts = async () => {
		setLoading(true);
		setError(null);
		try {
			const params: { accountType?: AccountType; isActive?: boolean } = {};
			if (filterType !== "ALL") params.accountType = filterType;
			if (filterActive !== "ALL") params.isActive = filterActive;
			const data = await chartOfAccountsApi.list(params);
			setAccounts(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur lors du chargement");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (authLoading || !isAuthenticated) return;
		loadAccounts();
	}, [authLoading, isAuthenticated, filterType, filterActive]);

	const stats = useMemo(() => {
		const byType: Record<string, number> = {};
		let active = 0;
		let inactive = 0;
		for (const a of accounts) {
			byType[a.accountType] = (byType[a.accountType] ?? 0) + 1;
			if (a.isActive) active++;
			else inactive++;
		}
		return {
			total: accounts.length,
			active,
			inactive,
			byType
		};
	}, [accounts]);

	const filtered = useMemo(() => {
		let result = accounts;
		const query = q.trim().toLowerCase();
		if (query) {
			result = result.filter(
				(a) =>
					a.code.toLowerCase().includes(query) ||
					a.name.toLowerCase().includes(query) ||
					(a.description && a.description.toLowerCase().includes(query))
			);
		}
		return result;
	}, [accounts, q]);

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Plan Comptable</h1>
					<p className="text-gray-600 mt-1">
						Référentiel des comptes du grand livre (COBAC / CEMAC)
					</p>
				</div>
				<div className="flex gap-3">
					<Button
						onClick={() => loadAccounts()}
						variant="outline"
						className="flex items-center gap-2"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Actualiser
					</Button>
					<Button
						onClick={() => router.push("/chart-of-accounts/new")}
						className="flex items-center gap-2"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Nouveau compte
					</Button>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl shadow-sm border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-slate-700 mb-1">Total</div>
							<div className="text-3xl font-bold text-slate-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-xl shadow-sm border border-emerald-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-emerald-700 mb-1">Actifs</div>
							<div className="text-3xl font-bold text-emerald-900">{stats.active}</div>
						</div>
						<div className="w-12 h-12 bg-emerald-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-rose-50 to-rose-100 p-5 rounded-xl shadow-sm border border-rose-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-rose-700 mb-1">Inactifs</div>
							<div className="text-3xl font-bold text-rose-900">{stats.inactive}</div>
						</div>
						<div className="w-12 h-12 bg-rose-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl shadow-sm border border-amber-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-amber-700 mb-1">Niveaux</div>
							<div className="text-3xl font-bold text-amber-900">
								{Math.max(0, ...accounts.map((a) => a.level))}
							</div>
						</div>
						<div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
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
								placeholder="Code, nom ou description..."
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
						<label className="block text-sm font-medium text-gray-700 mb-2">Type de compte</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm"
							value={filterType}
							onChange={(e) => setFilterType(e.target.value as "ALL" | AccountType)}
						>
							<option value="ALL">Tous les types</option>
							{(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => (
								<option key={type} value={type}>
									{ACCOUNT_TYPE_LABELS[type]}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm"
							value={filterActive === "ALL" ? "ALL" : filterActive ? "true" : "false"}
							onChange={(e) => {
								const v = e.target.value;
								setFilterActive(v === "ALL" ? "ALL" : v === "true");
							}}
						>
							<option value="ALL">Tous</option>
							<option value="true">Actif</option>
							<option value="false">Inactif</option>
						</select>
					</div>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2">
					<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600" />
					<p className="mt-4 text-gray-600">Chargement du plan comptable...</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">Aucun compte trouvé</p>
					<p className="text-gray-400 text-sm mt-2">Modifiez les filtres ou ajoutez un nouveau compte.</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Niveau</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{filtered.map((account) => (
									<tr key={account.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/chart-of-accounts/${account.id}`}
												className="font-mono font-medium text-slate-700 hover:text-slate-900"
											>
												{account.code}
											</Link>
										</td>
										<td className="px-6 py-4">
											<Link
												href={`/chart-of-accounts/${account.id}`}
												className="text-slate-700 hover:text-slate-900 hover:underline"
											>
												{account.name}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
												{ACCOUNT_TYPE_LABELS[account.accountType]}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-600">
											{account.level}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={account.isActive ? "success" : "danger"}>
												{account.isActive ? "Actif" : "Inactif"}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/chart-of-accounts/${account.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1.5 inline-flex">
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
						<div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
							{filtered.length} compte{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
