"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { ledgerAccountsApi, chartOfAccountsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { LedgerAccount, AccountType, LedgerAccountStatus, ChartOfAccount, CreateLedgerAccountRequest, UpdateLedgerAccountRequest } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function LedgerAccountsPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
	const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filterAccountType, setFilterAccountType] = useState<AccountType | "">("");
	const [filterCurrency, setFilterCurrency] = useState("");
	const [filterStatus, setFilterStatus] = useState<LedgerAccountStatus | "">("");
	const [searchQuery, setSearchQuery] = useState("");
	const [showForm, setShowForm] = useState(false);
	const [editingAccount, setEditingAccount] = useState<LedgerAccount | null>(null);
	const [form, setForm] = useState<CreateLedgerAccountRequest>({
		code: "",
		name: "",
		chartOfAccountCode: "",
		accountType: "ASSET",
		currency: "USD",
		status: "ACTIVE"
	});
	const [submitting, setSubmitting] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	// Force re-render when language changes
	useEffect(() => {
		// This effect ensures the component re-renders when language changes
	}, [i18n.language]);

	useEffect(() => {
		// Ne charger les données que si l'utilisateur est authentifié et que le chargement est terminé
		if (authLoading) return;
		if (!isAuthenticated) return;
		
		loadAccounts();
		loadChartOfAccounts();
	}, [filterAccountType, filterCurrency, filterStatus, authLoading, isAuthenticated]);

	useEffect(() => {
		if (editingAccount) {
			setForm({
				code: editingAccount.code,
				name: editingAccount.name,
				chartOfAccountCode: editingAccount.chartOfAccountCode,
				accountType: editingAccount.accountType,
				currency: editingAccount.currency,
				status: editingAccount.status
			});
			setShowForm(true);
		}
	}, [editingAccount]);

	async function loadAccounts() {
		setLoading(true);
		setError(null);
		try {
			const data = await ledgerAccountsApi.list({
				accountType: filterAccountType || undefined,
				currency: filterCurrency || undefined,
				status: filterStatus || undefined
			});
			setAccounts(data);
		} catch (e: any) {
			setError(e?.message ?? t("ledgerAccount.loadError"));
		} finally {
			setLoading(false);
		}
	}

	async function loadChartOfAccounts() {
		try {
			const data = await chartOfAccountsApi.list({ isActive: true });
			setChartOfAccounts(data);
		} catch (e) {
			console.error("Erreur lors du chargement du plan comptable:", e);
		}
	}

	function validateForm(): boolean {
		const errors: Record<string, string> = {};

		if (!form.code?.trim()) {
			errors.code = t("ledgerAccount.validation.codeRequired");
		} else if (form.code.length > 50) {
			errors.code = t("ledgerAccount.validation.codeMaxLength");
		}

		if (!form.name?.trim()) {
			errors.name = t("ledgerAccount.validation.nameRequired");
		}

		if (!form.chartOfAccountCode) {
			errors.chartOfAccountCode = t("ledgerAccount.validation.chartOfAccountRequired");
		} else {
			const chartAccount = chartOfAccounts.find(c => c.code === form.chartOfAccountCode);
			if (!chartAccount) {
				errors.chartOfAccountCode = t("ledgerAccount.validation.chartOfAccountNotFound");
			} else if (!chartAccount.isActive) {
				errors.chartOfAccountCode = t("ledgerAccount.validation.chartOfAccountInactive");
			} else if (chartAccount.accountType !== form.accountType) {
				errors.accountType = t("ledgerAccount.validation.accountTypeMismatch");
			}
		}

		if (!form.currency || form.currency.length !== 3) {
			errors.currency = t("ledgerAccount.validation.currencyInvalid");
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
				await ledgerAccountsApi.update(editingAccount.id, {
					name: form.name,
					accountType: form.accountType,
					currency: form.currency,
					status: form.status
				} as UpdateLedgerAccountRequest);
			} else {
				await ledgerAccountsApi.create(form);
			}
			setShowForm(false);
			setEditingAccount(null);
			setForm({
				code: "",
				name: "",
				chartOfAccountCode: "",
				accountType: "ASSET",
				currency: "USD",
				status: "ACTIVE"
			});
			loadAccounts();
		} catch (e: any) {
			const errorMessage = e?.message ?? (editingAccount ? t("ledgerAccount.updateError") : t("ledgerAccount.createError"));
			setError(errorMessage);
			
			// Vérifier spécifiquement si c'est une erreur de code existant pour un compte GL
			// Le message du backend est : "Un compte GL avec le code '...' existe déjà"
			const lowerMessage = errorMessage.toLowerCase();
			const isCodeExistsError = 
				e?.status === 409 || 
				(lowerMessage.includes("compte gl") && lowerMessage.includes("code") && (lowerMessage.includes("existe déjà") || lowerMessage.includes("déjà"))) ||
				(lowerMessage.includes("ledger account") && lowerMessage.includes("code") && (lowerMessage.includes("already exists") || lowerMessage.includes("duplicate")));
			
			if (isCodeExistsError) {
				setValidationErrors({
					code: t("ledgerAccount.validation.codeExists")
				});
			}
		} finally {
			setSubmitting(false);
		}
	}

	const filteredAccounts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return accounts.filter(account => {
			if (query) {
				const hay = `${account.code ?? ""} ${account.name ?? ""} ${account.chartOfAccountCode ?? ""}`.toLowerCase();
				if (!hay.includes(query)) return false;
			}
			return true;
		});
	}, [accounts, searchQuery]);

	const stats = useMemo(() => {
		const total = accounts.length;
		let active = 0;
		let inactive = 0;
		const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
		const byCurrency: Record<string, number> = {};
		for (const a of accounts) {
			if (a.status === "ACTIVE") active++;
			else inactive++;
			byCurrency[a.currency] = (byCurrency[a.currency] ?? 0) + 1;
		}
		return {
			total,
			active,
			inactive,
			totalBalance,
			currencies: Object.keys(byCurrency).length
		};
	}, [accounts]);

	function getAccountTypeLabel(type: AccountType): string {
		return t(`ledgerAccount.accountTypes.${type}`) || type;
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
					<h1 className="text-3xl font-bold text-gray-900">{t("ledgerAccount.title")}</h1>
					<p className="text-gray-600 mt-1">{t("ledgerAccount.subtitle")}</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={loadAccounts} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("ledgerAccount.refresh")}
					</Button>
					<Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						{showForm ? t("ledgerAccount.cancel") : t("ledgerAccount.newAccount")}
					</Button>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("ledgerAccount.stats.total")}</div>
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
							<div className="text-sm font-medium text-green-700 mb-1">{t("ledgerAccount.stats.active")}</div>
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
							<div className="text-sm font-medium text-red-700 mb-1">{t("ledgerAccount.stats.inactive")}</div>
							<div className="text-3xl font-bold text-red-900">{stats.inactive}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm border border-purple-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-purple-700 mb-1">{t("ledgerAccount.stats.currencies")}</div>
							<div className="text-3xl font-bold text-purple-900">{stats.currencies}</div>
						</div>
						<div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
					<h2 className="text-lg font-semibold text-gray-900">{t("ledgerAccount.filters.title")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("ledgerAccount.filters.search")}</label>
						<div className="relative">
							<Input
								placeholder={t("ledgerAccount.filters.searchPlaceholder")}
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
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("ledgerAccount.filters.accountType")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterAccountType}
							onChange={(e) => setFilterAccountType(e.target.value as AccountType || "")}
						>
							<option value="">{t("ledgerAccount.filters.allTypes")}</option>
							<option value="ASSET">{t("ledgerAccount.accountTypes.ASSET")}</option>
							<option value="LIABILITY">{t("ledgerAccount.accountTypes.LIABILITY")}</option>
							<option value="EQUITY">{t("ledgerAccount.accountTypes.EQUITY")}</option>
							<option value="REVENUE">{t("ledgerAccount.accountTypes.REVENUE")}</option>
							<option value="EXPENSE">{t("ledgerAccount.accountTypes.EXPENSE")}</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("ledgerAccount.filters.currency")}</label>
						<Input
							value={filterCurrency}
							onChange={(e) => setFilterCurrency(e.target.value.toUpperCase())}
							placeholder={t("ledgerAccount.filters.currencyPlaceholder")}
							maxLength={3}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("ledgerAccount.filters.status")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value as LedgerAccountStatus || "")}
						>
							<option value="">{t("ledgerAccount.filters.allStatuses")}</option>
							<option value="ACTIVE">{t("ledgerAccount.statuses.ACTIVE")}</option>
							<option value="INACTIVE">{t("ledgerAccount.statuses.INACTIVE")}</option>
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
							{editingAccount ? t("ledgerAccount.form.editTitle") : t("ledgerAccount.form.newTitle")}
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
									chartOfAccountCode: "",
									accountType: "ASSET",
									currency: "USD",
									status: "ACTIVE"
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
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.code")}</label>
								<Input
									value={form.code || ""}
									onChange={e => {
										setForm({ ...form, code: e.target.value });
										if (validationErrors.code) {
											setValidationErrors({ ...validationErrors, code: "" });
										}
									}}
									required
									maxLength={50}
									disabled={!!editingAccount}
									className={editingAccount ? "bg-gray-100" : ""}
								/>
								{validationErrors.code && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.code}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.name")}</label>
								<Input
									value={form.name || ""}
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
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.chartOfAccount")}</label>
								<div className="relative">
									<select
										className={`w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none ${
											editingAccount 
												? "bg-gray-100 cursor-not-allowed text-gray-500" 
												: "hover:border-gray-400"
										} ${validationErrors.chartOfAccountCode ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""}`}
										value={form.chartOfAccountCode || ""}
										onChange={e => {
											const selected = chartOfAccounts.find(c => c.code === e.target.value);
											setForm({ 
												...form, 
												chartOfAccountCode: e.target.value,
												accountType: selected?.accountType || form.accountType
											});
											if (validationErrors.chartOfAccountCode) {
												setValidationErrors({ ...validationErrors, chartOfAccountCode: "" });
											}
										}}
										required
										disabled={!!editingAccount}
									>
										<option value="" disabled>{t("ledgerAccount.form.selectChartOfAccount")}</option>
										{chartOfAccounts.filter(c => c.isActive).map(coa => (
											<option key={coa.id} value={coa.code}>
												{coa.code} - {coa.name} ({getAccountTypeLabel(coa.accountType)})
											</option>
										))}
									</select>
									<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
										<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</div>
								</div>
								{validationErrors.chartOfAccountCode && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.chartOfAccountCode}</p>
								)}
								{form.chartOfAccountCode && (
									<p className="text-xs text-gray-500 mt-1">
										{t("ledgerAccount.form.autoType", { type: getAccountTypeLabel(form.accountType) })}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.accountType")}</label>
								<div className="relative">
									<select
										className={`w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none ${
											form.chartOfAccountCode 
												? "bg-gray-100 cursor-not-allowed text-gray-500" 
												: "hover:border-gray-400"
										} ${validationErrors.accountType ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""}`}
										value={form.accountType}
										onChange={e => {
											const newType = e.target.value as AccountType;
											setForm({ ...form, accountType: newType });
											if (validationErrors.accountType) {
												setValidationErrors({ ...validationErrors, accountType: "" });
											}
										}}
										required
										disabled={!!form.chartOfAccountCode}
									>
										<option value="ASSET">{t("ledgerAccount.accountTypes.ASSET")}</option>
										<option value="LIABILITY">{t("ledgerAccount.accountTypes.LIABILITY")}</option>
										<option value="EQUITY">{t("ledgerAccount.accountTypes.EQUITY")}</option>
										<option value="REVENUE">{t("ledgerAccount.accountTypes.REVENUE")}</option>
										<option value="EXPENSE">{t("ledgerAccount.accountTypes.EXPENSE")}</option>
									</select>
									<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
										<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</div>
								</div>
								{validationErrors.accountType && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.accountType}</p>
								)}
								{form.chartOfAccountCode && (
									<p className="text-xs text-gray-500 mt-1">{t("ledgerAccount.form.definedByChart")}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.currency")}</label>
								<Input
									value={form.currency || ""}
									onChange={e => {
										setForm({ ...form, currency: e.target.value.toUpperCase() });
										if (validationErrors.currency) {
											setValidationErrors({ ...validationErrors, currency: "" });
										}
									}}
									required
									maxLength={3}
									minLength={3}
								/>
								{validationErrors.currency && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.currency}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.status")}</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.status || "ACTIVE"}
									onChange={e => setForm({ ...form, status: e.target.value as LedgerAccountStatus })}
								>
									<option value="ACTIVE">{t("ledgerAccount.statuses.ACTIVE")}</option>
									<option value="INACTIVE">{t("ledgerAccount.statuses.INACTIVE")}</option>
								</select>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-4">
							<Button type="button" variant="outline" onClick={() => setShowForm(false)}>
								{t("ledgerAccount.form.cancel")}
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting ? (editingAccount ? t("ledgerAccount.form.editing") : t("ledgerAccount.form.creating")) : (editingAccount ? t("ledgerAccount.form.edit") : t("ledgerAccount.form.create"))}
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">{t("ledgerAccount.loading")}</p>
				</div>
			) : filteredAccounts.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("ledgerAccount.table.noAccounts")}</p>
					<p className="text-gray-400 text-sm mt-2">{t("ledgerAccount.table.noAccountsHint")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.table.code")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-48 max-w-xs">{t("ledgerAccount.table.name")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.table.chartOfAccount")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.table.type")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.table.currency")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.table.balance")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.table.status")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredAccounts.map(account => (
									<tr key={account.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{account.code}</span>
										</td>
										<td className="px-6 py-4 w-48 max-w-xs break-words">
											<Link href={`/ledger-accounts/${account.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
												{account.name}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											<Link href={`/chart-of-accounts/by-code/${account.chartOfAccountCode}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono">
												{account.chartOfAccountCode}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={getAccountTypeBadgeVariant(account.accountType)}>
												{getAccountTypeLabel(account.accountType)}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
												{account.currency}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
											{account.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.currency}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={account.status === "ACTIVE" ? "success" : "neutral"}>
												{account.status === "ACTIVE" ? t("ledgerAccount.table.active") : t("ledgerAccount.table.inactive")}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<div className="flex items-center justify-end gap-2">
												<Link href={`/ledger-accounts/${account.id}`}>
													<Button variant="outline" size="sm" className="flex items-center gap-1">
														<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
														</svg>
														{t("ledgerAccount.table.view")}
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
													{t("ledgerAccount.table.edit")}
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
								{t(`ledgerAccount.table.displaying_${filteredAccounts.length === 1 ? 'one' : 'other'}`, { 
									count: filteredAccounts.length
								})}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
