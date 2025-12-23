"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { ledgerAccountsApi, chartOfAccountsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { LedgerAccount, AccountType, LedgerAccountStatus, ChartOfAccount, UpdateLedgerAccountRequest, LedgerEntry } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function LedgerAccountDetailPage() {
	const { t, i18n } = useTranslation();
	const params = useParams();
	const router = useRouter();
	const accountId = params.id as string;
	const { isAuthenticated, loading: authLoading } = useAuth();
	
	const [account, setAccount] = useState<LedgerAccount | null>(null);
	const [chartOfAccount, setChartOfAccount] = useState<ChartOfAccount | null>(null);
	const [entries, setEntries] = useState<LedgerEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [entriesLoading, setEntriesLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showEditForm, setShowEditForm] = useState(false);
	const [editForm, setEditForm] = useState<UpdateLedgerAccountRequest>({
		name: "",
		currency: "USD",
		status: "ACTIVE"
	});
	const [submitting, setSubmitting] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	
	// Filters for entries
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	// Force re-render when language changes
	useEffect(() => {
		// This effect ensures the component re-renders when language changes
	}, [i18n.language]);

	useEffect(() => {
		if (authLoading) return;
		if (!isAuthenticated) return;
		if (accountId) {
			loadAccount();
			loadEntries();
		}
	}, [accountId, authLoading, isAuthenticated]);

	useEffect(() => {
		if (account && showEditForm) {
			setEditForm({
				name: account.name,
				currency: account.currency,
				status: account.status
			});
			setValidationErrors({});
		}
	}, [account, showEditForm]);

	useEffect(() => {
		if (accountId) {
			loadEntries();
		}
	}, [startDate, endDate, accountId]);

	async function loadAccount() {
		setLoading(true);
		setError(null);
		try {
			const data = await ledgerAccountsApi.get(accountId);
			setAccount(data);
			
			// Load chart of account
			try {
				const chartData = await chartOfAccountsApi.getByCode(data.chartOfAccountCode);
				setChartOfAccount(chartData);
			} catch (e) {
				console.error("Erreur lors du chargement du plan comptable:", e);
			}
		} catch (e: any) {
			setError(e?.message ?? t("ledgerAccount.loadError"));
		} finally {
			setLoading(false);
		}
	}

	async function loadEntries() {
		if (!accountId) return;
		setEntriesLoading(true);
		try {
			const params: { startDate?: string; endDate?: string } = {};
			if (startDate) params.startDate = startDate;
			if (endDate) params.endDate = endDate;
			const data = await ledgerAccountsApi.getEntries(accountId, params);
			setEntries(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des écritures:", e);
		} finally {
			setEntriesLoading(false);
		}
	}

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

	function validateForm(): boolean {
		const errors: Record<string, string> = {};
		if (!editForm.name?.trim()) {
			errors.name = t("ledgerAccount.validation.nameRequired");
		}
		if (!editForm.currency || editForm.currency.length !== 3) {
			errors.currency = t("ledgerAccount.validation.currencyInvalid");
		}
		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!validateForm() || !account) return;

		setSubmitting(true);
		setError(null);
		try {
			await ledgerAccountsApi.update(account.id, editForm);
			setShowEditForm(false);
			loadAccount();
		} catch (e: any) {
			const errorMessage = e?.message || t("ledgerAccount.updateError");
			setError(errorMessage);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleToggleStatus() {
		if (!account) return;
		try {
			if (account.status === "ACTIVE") {
				await ledgerAccountsApi.deactivate(account.id);
			} else {
				await ledgerAccountsApi.activate(account.id);
			}
			loadAccount();
		} catch (e: any) {
			setError(e?.message || t("ledgerAccount.updateError"));
		}
	}

	const entriesStats = useMemo(() => {
		const totalDebit = entries.reduce((sum, e) => sum + (e.debitAmount || 0), 0);
		const totalCredit = entries.reduce((sum, e) => sum + (e.creditAmount || 0), 0);
		return {
			totalEntries: entries.length,
			totalDebit,
			totalCredit,
			balance: totalDebit - totalCredit
		};
	}, [entries]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">{t("ledgerAccount.loading")}</p>
				</div>
			</div>
		);
	}

	if (error || !account) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">{t("common.error")}</div>
						<div className="text-sm mt-1">{error ?? t("ledgerAccount.loadError")}</div>
					</div>
				</div>
				<Link href="/ledger-accounts">
					<Button className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("common.back")}
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav className="flex items-center gap-2 text-sm text-gray-600">
				<Link href="/ledger-accounts" className="hover:text-gray-900">
					{t("sidebar.ledgerAccounts")}
				</Link>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span className="text-gray-900 font-medium">{account.name}</span>
			</nav>

			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
						<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
						<div className="flex items-center gap-3 mt-2">
							<span className="font-mono text-lg font-medium text-gray-600">{account.code}</span>
							<Badge variant={getAccountTypeBadgeVariant(account.accountType)}>
								{getAccountTypeLabel(account.accountType)}
							</Badge>
							<Badge variant={account.status === "ACTIVE" ? "success" : "neutral"}>
								{account.status === "ACTIVE" ? t("ledgerAccount.statuses.ACTIVE") : t("ledgerAccount.statuses.INACTIVE")}
							</Badge>
							<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
								{account.currency}
							</span>
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button onClick={loadAccount} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Button
						onClick={() => setShowEditForm(!showEditForm)}
						variant="outline"
						className="flex items-center gap-2"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						{showEditForm ? t("common.cancel") : t("ledgerAccount.table.edit")}
					</Button>
					<Button
						onClick={handleToggleStatus}
						variant={account.status === "ACTIVE" ? "outline" : "default"}
						className="flex items-center gap-2"
					>
						{account.status === "ACTIVE" ? t("ledgerAccount.statuses.INACTIVE") : t("ledgerAccount.statuses.ACTIVE")}
					</Button>
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

			{/* Formulaire d'édition */}
			{showEditForm && (
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">{t("ledgerAccount.form.editTitle")}</h3>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.name")}</label>
								<Input
									value={editForm.name || ""}
									onChange={e => {
										setEditForm({ ...editForm, name: e.target.value });
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
								<label className="block text-sm font-medium text-gray-700 mb-1">{t("ledgerAccount.form.currency")}</label>
								<Input
									value={editForm.currency || ""}
									onChange={e => {
										setEditForm({ ...editForm, currency: e.target.value.toUpperCase() });
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
									value={editForm.status || "ACTIVE"}
									onChange={e => setEditForm({ ...editForm, status: e.target.value as LedgerAccountStatus })}
								>
									<option value="ACTIVE">{t("ledgerAccount.statuses.ACTIVE")}</option>
									<option value="INACTIVE">{t("ledgerAccount.statuses.INACTIVE")}</option>
								</select>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-4">
							<Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
								{t("ledgerAccount.form.cancel")}
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting ? t("ledgerAccount.form.editing") : t("ledgerAccount.form.edit")}
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Informations principales */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-gray-700">{t("ledgerAccount.table.balance")}</h3>
					</div>
					<div className="text-3xl font-bold text-gray-900">
						{account.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.currency}
					</div>
					<div className="text-sm text-gray-500 mt-1">
						{t("ledgerAccount.detail.availableBalance")}: {account.availableBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.currency}
					</div>
				</div>
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-gray-700">{t("ledgerAccount.table.chartOfAccount")}</h3>
					</div>
					{chartOfAccount ? (
						<>
							<Link href={`/chart-of-accounts/by-code/${account.chartOfAccountCode}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-lg">
								{account.chartOfAccountCode}
							</Link>
							<div className="text-sm text-gray-600 mt-1">{chartOfAccount.name}</div>
						</>
					) : (
						<div className="font-mono text-lg text-gray-600">{account.chartOfAccountCode}</div>
					)}
				</div>
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-gray-700">{t("common.dates")}</h3>
					</div>
					<div className="space-y-1 text-sm">
						<div className="text-gray-600">
							<span className="font-medium">{t("common.createdAt")}:</span>{" "}
							{new Date(account.createdAt).toLocaleDateString("fr-FR")}
						</div>
						<div className="text-gray-600">
							<span className="font-medium">{t("common.updatedAt")}:</span>{" "}
							{new Date(account.updatedAt).toLocaleDateString("fr-FR")}
						</div>
					</div>
				</div>
			</div>

			{/* Statistiques des écritures */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="text-sm font-medium text-blue-700 mb-1">{t("ledgerAccount.entries.total")}</div>
					<div className="text-3xl font-bold text-blue-900">{entriesStats.totalEntries}</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="text-sm font-medium text-green-700 mb-1">{t("ledgerAccount.entries.totalDebit")}</div>
					<div className="text-3xl font-bold text-green-900">
						{entriesStats.totalDebit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.currency}
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="text-sm font-medium text-red-700 mb-1">{t("ledgerAccount.entries.totalCredit")}</div>
					<div className="text-3xl font-bold text-red-900">
						{entriesStats.totalCredit.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.currency}
					</div>
				</div>
				<div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm border border-purple-200">
					<div className="text-sm font-medium text-purple-700 mb-1">{t("ledgerAccount.entries.balance")}</div>
					<div className="text-3xl font-bold text-purple-900">
						{entriesStats.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {account.currency}
					</div>
				</div>
			</div>

			{/* Filtres pour les écritures */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("ledgerAccount.entries.title")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("ledgerAccount.entries.startDate")}</label>
						<Input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("ledgerAccount.entries.endDate")}</label>
						<Input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
					<div className="flex items-end">
						<Button
							variant="outline"
							onClick={() => {
								setStartDate("");
								setEndDate("");
							}}
							className="w-full"
						>
							{t("common.reset")}
						</Button>
					</div>
				</div>
			</div>

			{/* Liste des écritures */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				{entriesLoading ? (
					<div className="p-12 text-center">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						<p className="mt-4 text-gray-600">{t("ledgerAccount.entries.loading")}</p>
					</div>
				) : entries.length === 0 ? (
					<div className="p-12 text-center">
						<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<p className="text-gray-500 text-lg font-medium">{t("ledgerAccount.entries.noEntries")}</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.entries.date")}</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.entries.valueDate")}</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.entries.type")}</th>
										<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.entries.debit")}</th>
										<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.entries.credit")}</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.entries.description")}</th>
										<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("ledgerAccount.entries.reference")}</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{entries.map(entry => {
										const isDebit = entry.debitAmount > 0;
										return (
											<tr key={entry.id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{new Date(entry.entryDate).toLocaleDateString("fr-FR")}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
													{new Date(entry.valueDate).toLocaleDateString("fr-FR")}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<Badge variant={isDebit ? "info" : "warning"}>
														{isDebit ? t("ledgerAccount.entries.debit") : t("ledgerAccount.entries.credit")}
													</Badge>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
													{isDebit ? entry.debitAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "-"}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
													{!isDebit ? entry.creditAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "-"}
												</td>
												<td className="px-6 py-4 text-sm text-gray-600">
													{entry.description || "-"}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
													{entry.referenceType && entry.referenceId ? (
														<span className="font-mono">
															{entry.referenceType}#{entry.referenceId}
														</span>
													) : "-"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						{entries.length > 0 && (
							<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
								<p className="text-sm text-gray-600">
									{t(`ledgerAccount.entries.displaying_${entries.length === 1 ? 'one' : 'other'}`, { 
										count: entries.length
									})}
								</p>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
