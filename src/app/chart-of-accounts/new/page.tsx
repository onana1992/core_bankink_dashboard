"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { chartOfAccountsApi } from "@/lib/api";
import type { CreateChartOfAccountRequest, ChartOfAccount, AccountType } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export default function NewChartOfAccountPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const [form, setForm] = useState<CreateChartOfAccountRequest>({
		code: "",
		name: "",
		description: "",
		accountType: "ASSET",
		category: "",
		parentCode: "",
		level: 1,
		isActive: true
	});
	const [rootAccounts, setRootAccounts] = useState<ChartOfAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		// Re-render when language changes
	}, [i18n.language]);

	useEffect(() => {
		loadRootAccounts();
	}, []);

	async function loadRootAccounts() {
		setLoading(true);
		try {
			const data = await chartOfAccountsApi.getRootAccounts();
			setRootAccounts(Array.isArray(data) ? data : []);
		} catch {
			setRootAccounts([]);
		} finally {
			setLoading(false);
		}
	}

	function validate(): boolean {
		const errors: Record<string, string> = {};
		if (!form.code?.trim()) {
			errors.code = t("chartOfAccount.form.codeRequired");
		}
		if (!form.name?.trim()) {
			errors.name = t("chartOfAccount.form.nameRequired");
		}
		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!validate()) return;

		setSubmitting(true);
		setError(null);
		try {
			const payload: CreateChartOfAccountRequest = {
				code: form.code.trim(),
				name: form.name.trim(),
				accountType: form.accountType,
				isActive: form.isActive ?? true
			};
			if (form.description?.trim()) payload.description = form.description.trim();
			if (form.category?.trim()) payload.category = form.category.trim();
			if (form.parentCode?.trim()) payload.parentCode = form.parentCode.trim();
			if (form.level != null) payload.level = form.level;

			const created = await chartOfAccountsApi.create(payload);
			router.push(`/chart-of-accounts/${created.id}`);
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : undefined;
			setError(message ?? t("chartOfAccount.createError"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-6">
			<nav className="flex items-center gap-2 text-sm text-gray-600">
				<Link href="/chart-of-accounts" className="hover:text-gray-900">
					{t("chartOfAccount.form.breadcrumb")}
				</Link>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
				<span className="text-gray-900 font-medium">{t("chartOfAccount.form.newBreadcrumb")}</span>
			</nav>

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-blue-500/10 via-transparent to-transparent px-6 py-5 border-b border-gray-100">
					<div className="flex items-start gap-4">
						<div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
							<svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
							</svg>
						</div>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">{t("chartOfAccount.form.newTitle")}</h1>
							<p className="text-gray-500 mt-1">{t("chartOfAccount.form.newSubtitle")}</p>
						</div>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-center gap-2">
					<svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<span>{error}</span>
				</div>
			)}

			<form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="p-6 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">{t("chartOfAccount.form.code")}</label>
							<Input
								value={form.code}
								onChange={e => {
									setForm({ ...form, code: e.target.value });
									if (validationErrors.code) setValidationErrors({ ...validationErrors, code: "" });
								}}
								placeholder={t("chartOfAccount.form.codePlaceholder")}
								required
							/>
							{validationErrors.code && <p className="text-xs text-red-600 mt-1">{validationErrors.code}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">{t("chartOfAccount.form.name")}</label>
							<Input
								value={form.name}
								onChange={e => {
									setForm({ ...form, name: e.target.value });
									if (validationErrors.name) setValidationErrors({ ...validationErrors, name: "" });
								}}
								placeholder={t("chartOfAccount.form.namePlaceholder")}
								required
							/>
							{validationErrors.name && <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>}
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">{t("chartOfAccount.form.accountType")}</label>
						<select
							value={form.accountType}
							onChange={e => setForm({ ...form, accountType: e.target.value as AccountType })}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							{ACCOUNT_TYPES.map(type => (
								<option key={type} value={type}>
									{t(`chartOfAccount.accountTypes.${type}`)}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">{t("chartOfAccount.form.description")}</label>
						<textarea
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={form.description || ""}
							onChange={e => setForm({ ...form, description: e.target.value })}
							rows={3}
							placeholder={t("chartOfAccount.form.descriptionPlaceholder")}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">{t("chartOfAccount.form.parentAccount")}</label>
							<select
								value={form.parentCode || ""}
								onChange={e => setForm({ ...form, parentCode: e.target.value || undefined })}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								disabled={loading}
							>
								<option value="">{t("chartOfAccount.form.noParent")}</option>
								{rootAccounts.map(acc => (
									<option key={acc.id} value={acc.code}>
									{acc.code} — {acc.name}
									</option>
								))}
							</select>
							<p className="text-xs text-gray-500 mt-1">{t("chartOfAccount.form.parentHint")}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">{t("chartOfAccount.form.level")}</label>
							<Input
								type="number"
								min={1}
								value={form.level ?? 1}
								onChange={e => setForm({ ...form, level: parseInt(e.target.value, 10) || 1 })}
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">{t("chartOfAccount.form.category")}</label>
						<Input
							value={form.category || ""}
							onChange={e => setForm({ ...form, category: e.target.value })}
							placeholder={t("chartOfAccount.form.categoryPlaceholder")}
							maxLength={50}
						/>
					</div>

					<div>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={form.isActive ?? true}
								onChange={e => setForm({ ...form, isActive: e.target.checked })}
								className="rounded"
							/>
							<span className="text-sm text-gray-700">{t("chartOfAccount.form.active")}</span>
						</label>
					</div>
				</div>

				<div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
					<Link href="/chart-of-accounts">
						<Button type="button" variant="outline">
							{t("chartOfAccount.cancel")}
						</Button>
					</Link>
					<Button type="submit" disabled={submitting}>
						{submitting ? t("chartOfAccount.form.creating") : t("chartOfAccount.form.create")}
					</Button>
				</div>
			</form>
		</div>
	);
}
