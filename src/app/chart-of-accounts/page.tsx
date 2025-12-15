"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { chartOfAccountsApi } from "@/lib/api";
import type { ChartOfAccount, AccountType } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function ChartOfAccountsPage() {
	const router = useRouter();
	const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
	const [parentAccounts, setParentAccounts] = useState<ChartOfAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filterAccountType, setFilterAccountType] = useState<AccountType | "">("");
	const [filterActive, setFilterActive] = useState<boolean | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [showForm, setShowForm] = useState(false);
	const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
	const [form, setForm] = useState({
		code: "",
		name: "",
		description: "",
		accountType: "ASSET" as AccountType,
		category: "",
		parentCode: "",
		level: 1,
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		loadAccounts();
		loadParentAccounts();
	}, [filterAccountType, filterActive]);

	useEffect(() => {
		if (editingAccount) {
			setForm({
				code: editingAccount.code,
				name: editingAccount.name,
				description: editingAccount.description || "",
				accountType: editingAccount.accountType,
				category: editingAccount.category || "",
				parentCode: editingAccount.parentCode || "",
				level: editingAccount.level,
				isActive: editingAccount.isActive
			});
			setShowForm(true);
		}
	}, [editingAccount]);

	async function loadAccounts() {
		setLoading(true);
		setError(null);
		try {
			const data = await chartOfAccountsApi.list({
				accountType: filterAccountType || undefined,
				isActive: filterActive !== null ? filterActive : undefined
			});
			setAccounts(data);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des comptes comptables");
		} finally {
			setLoading(false);
		}
	}

	async function loadParentAccounts() {
		try {
			const data = await chartOfAccountsApi.list({ isActive: true });
			setParentAccounts(data);
		} catch (e) {
			console.error("Erreur lors du chargement des comptes parents:", e);
		}
	}

	function validateForm(): boolean {
		const errors: Record<string, string> = {};

		if (!form.code.trim()) {
			errors.code = "Le code est requis";
		} else if (form.code.length > 20) {
			errors.code = "Le code ne peut pas dépasser 20 caractères";
		}

		if (!form.name.trim()) {
			errors.name = "Le nom est requis";
		}

		if (form.parentCode) {
			const parent = parentAccounts.find(p => p.code === form.parentCode);
			if (!parent) {
				errors.parentCode = "Le compte parent n'existe pas";
			} else if (!parent.isActive) {
				errors.parentCode = "Le compte parent doit être actif";
			} else if (parent.accountType !== form.accountType) {
				errors.parentCode = "Le type doit correspondre au type du compte parent";
			}
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!validateForm()) {
			return;
		}

		setSubmitting(true);
		setError(null);
		setValidationErrors({});
		try {
			if (editingAccount) {
				await chartOfAccountsApi.update(editingAccount.id, {
					name: form.name,
					description: form.description,
					accountType: form.accountType,
					category: form.category,
					parentCode: form.parentCode || undefined,
					level: form.level,
					isActive: form.isActive
				});
			} else {
				await chartOfAccountsApi.create(form);
			}
			setShowForm(false);
			setEditingAccount(null);
			setForm({
				code: "",
				name: "",
				description: "",
				accountType: "ASSET",
				category: "",
				parentCode: "",
				level: 1,
				isActive: true
			});
			loadAccounts();
			loadParentAccounts();
		} catch (e: any) {
			setError(e?.message ?? `Erreur lors de la ${editingAccount ? "modification" : "création"}`);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete(id: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte comptable ?")) return;
		try {
			await chartOfAccountsApi.delete(id);
			loadAccounts();
			loadParentAccounts();
		} catch (e: any) {
			alert(e?.message || "Erreur lors de la suppression");
		}
	}

	async function handleToggleActive(account: ChartOfAccount) {
		try {
			await chartOfAccountsApi.update(account.id, {
				isActive: !account.isActive
			});
			loadAccounts();
			loadParentAccounts();
		} catch (e: any) {
			alert(e?.message || "Erreur lors de la modification");
		}
	}

	function handleParentCodeChange(parentCode: string) {
		const parent = parentAccounts.find(p => p.code === parentCode);
		if (parent) {
			const newLevel = parent.level + 1;
			setForm({
				...form,
				parentCode,
				accountType: parent.accountType,
				level: newLevel
			});
		} else {
			setForm({
				...form,
				parentCode,
				level: 1
			});
		}
	}

	const filteredAccounts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return accounts.filter(account => {
			if (query) {
				const hay = `${account.code ?? ""} ${account.name ?? ""} ${account.description ?? ""}`.toLowerCase();
				if (!hay.includes(query)) return false;
			}
			return true;
		});
	}, [accounts, searchQuery]);

	const stats = useMemo(() => {
		const total = accounts.length;
		const byType: Record<string, number> = {};
		let active = 0;
		let inactive = 0;
		for (const a of accounts) {
			byType[a.accountType] = (byType[a.accountType] ?? 0) + 1;
			if (a.isActive) active++;
			else inactive++;
		}
		return {
			total,
			active,
			inactive,
			assets: byType["ASSET"] ?? 0,
			liabilities: byType["LIABILITY"] ?? 0,
			equity: byType["EQUITY"] ?? 0,
			revenue: byType["REVENUE"] ?? 0,
			expense: byType["EXPENSE"] ?? 0
		};
	}, [accounts]);

	function getAccountTypeLabel(type: AccountType) {
		const labels: Record<AccountType, string> = {
			ASSET: "Actif",
			LIABILITY: "Passif",
			EQUITY: "Capitaux propres",
			REVENUE: "Produit",
			EXPENSE: "Charge"
		};
		return labels[type] || type;
	}

	function getAccountTypeBadgeVariant(type: AccountType): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (type) {
			case "ASSET":
				return "info";
			case "LIABILITY":
				return "danger";
			case "EQUITY":
				return "success";
			case "REVENUE":
				return "info";
			case "EXPENSE":
				return "warning";
			default:
				return "neutral";
		}
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Plan Comptable</h1>
					<p className="text-gray-600 mt-1">Gestion et configuration du plan comptable bancaire</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={loadAccounts} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Actualiser
					</Button>
					<Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						{showForm ? "Annuler" : "Nouveau compte"}
					</Button>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">Total</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">Inactifs</div>
							<div className="text-3xl font-bold text-red-900">{stats.inactive}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
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
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterAccountType}
							onChange={(e) => setFilterAccountType(e.target.value as AccountType || "")}
						>
							<option value="">Tous les types</option>
							<option value="ASSET">Actif</option>
							<option value="LIABILITY">Passif</option>
							<option value="EQUITY">Capitaux propres</option>
							<option value="REVENUE">Produit</option>
							<option value="EXPENSE">Charge</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterActive === null ? "" : filterActive ? "true" : "false"}
							onChange={(e) => setFilterActive(e.target.value === "" ? null : e.target.value === "true")}
						>
							<option value="">Tous les statuts</option>
							<option value="true">Actifs</option>
							<option value="false">Inactifs</option>
						</select>
					</div>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{/* Formulaire de création/modification */}
			{showForm && (
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-lg font-semibold text-gray-900">
							{editingAccount ? "Modifier le compte comptable" : "Nouveau compte comptable"}
						</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								setShowForm(false);
								setEditingAccount(null);
								setForm({
									code: "",
									name: "",
									description: "",
									accountType: "ASSET",
									category: "",
									parentCode: "",
									level: 1,
									isActive: true
								});
								setValidationErrors({});
							}}
						>
							✕
						</Button>
					</div>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
								<Input
									value={form.code}
									onChange={e => {
										setForm({ ...form, code: e.target.value });
										if (validationErrors.code) {
											setValidationErrors({ ...validationErrors, code: "" });
										}
									}}
									required
									maxLength={20}
									disabled={!!editingAccount}
									className={editingAccount ? "bg-gray-100" : ""}
								/>
								{validationErrors.code && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.code}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
								<Input
									value={form.name}
									onChange={e => {
										setForm({ ...form, name: e.target.value });
										if (validationErrors.name) {
											setValidationErrors({ ...validationErrors, name: "" });
										}
									}}
									required
								/>
								{validationErrors.name && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>
								)}
							</div>
							<div className="col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.description}
									onChange={e => setForm({ ...form, description: e.target.value })}
									rows={3}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Type de compte *</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.accountType}
									onChange={e => {
										const newType = e.target.value as AccountType;
										if (form.parentCode) {
											const parent = parentAccounts.find(p => p.code === form.parentCode);
											if (parent && parent.accountType !== newType) {
												setValidationErrors({
													...validationErrors,
													accountType: "Le type doit correspondre au type du compte parent"
												});
											} else {
												const newErrors = { ...validationErrors };
												delete newErrors.accountType;
												setValidationErrors(newErrors);
											}
										}
										setForm({ ...form, accountType: newType });
									}}
									required
									disabled={!!form.parentCode}
									className={form.parentCode ? "bg-gray-100" : ""}
								>
									<option value="ASSET">Actif</option>
									<option value="LIABILITY">Passif</option>
									<option value="EQUITY">Capitaux propres</option>
									<option value="REVENUE">Produit</option>
									<option value="EXPENSE">Charge</option>
								</select>
								{validationErrors.accountType && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.accountType}</p>
								)}
								{form.parentCode && (
									<p className="text-xs text-gray-500 mt-1">Défini par le compte parent</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
								<Input
									value={form.category}
									onChange={e => setForm({ ...form, category: e.target.value })}
									maxLength={50}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Compte parent</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.parentCode}
									onChange={e => handleParentCodeChange(e.target.value)}
								>
									<option value="">Aucun (compte racine)</option>
									{parentAccounts
										.filter(p => !editingAccount || p.id !== editingAccount.id)
										.map(parent => (
											<option key={parent.id} value={parent.code}>
												{parent.code} - {parent.name} (Niveau {parent.level})
											</option>
										))}
								</select>
								{validationErrors.parentCode && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.parentCode}</p>
								)}
								{form.parentCode && (
									<p className="text-xs text-gray-500 mt-1">
										Le niveau sera automatiquement calculé: {form.level}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
								<Input
									type="number"
									value={form.level}
									onChange={e => setForm({ ...form, level: parseInt(e.target.value) || 1 })}
									min={1}
									disabled={!!form.parentCode}
									className={form.parentCode ? "bg-gray-100" : ""}
								/>
								{form.parentCode && (
									<p className="text-xs text-gray-500 mt-1">Calculé automatiquement</p>
								)}
							</div>
							<div className="col-span-2">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={form.isActive}
										onChange={e => setForm({ ...form, isActive: e.target.checked })}
										className="rounded"
									/>
									<span className="text-sm text-gray-700">Actif</span>
								</label>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-4">
							<Button type="button" variant="outline" onClick={() => setShowForm(false)}>
								Annuler
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting ? (editingAccount ? "Modification..." : "Création...") : (editingAccount ? "Modifier" : "Créer")}
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement des comptes comptables...</p>
				</div>
			) : filteredAccounts.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">Aucun compte comptable trouvé</p>
					<p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres de recherche</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-48 max-w-xs">Nom</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Niveau</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Parent</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredAccounts.map(account => (
									<tr key={account.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{account.code}</span>
										</td>
										<td className="px-6 py-4 w-48 max-w-xs break-words">
											<Link href={`/chart-of-accounts/${account.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
												{account.name}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={getAccountTypeBadgeVariant(account.accountType)}>
												{getAccountTypeLabel(account.accountType)}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{account.level}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{account.parentCode ? (
												<Link href={`/chart-of-accounts/by-code/${account.parentCode}`} className="text-blue-600 hover:text-blue-800 hover:underline">
													{account.parentCode}
												</Link>
											) : (
												"-"
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={account.isActive ? "success" : "neutral"}>
												{account.isActive ? "Actif" : "Inactif"}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<div className="flex items-center justify-end gap-2">
												<Link href={`/chart-of-accounts/${account.id}`}>
													<Button variant="outline" size="sm" className="flex items-center gap-1">
														<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
														</svg>
														Voir
													</Button>
												</Link>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setEditingAccount(account)}
													className="flex items-center gap-1"
												>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
													Modifier
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{filteredAccounts.length > 0 && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								Affichage de <span className="font-semibold">{filteredAccounts.length}</span> compte{filteredAccounts.length > 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
