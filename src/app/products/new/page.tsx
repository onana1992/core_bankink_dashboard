"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { productsApi } from "@/lib/api";
import type { CreateProductRequest, ProductCategory } from "@/types";

export default function NewProductPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [form, setForm] = useState<CreateProductRequest>({
		code: "",
		name: "",
		description: "",
		category: "CURRENT_ACCOUNT",
		currency: "USD",
		minBalance: undefined,
		maxBalance: undefined,
		defaultInterestRate: undefined
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function update<K extends keyof CreateProductRequest>(key: K, value: CreateProductRequest[K]) {
		setForm(prev => ({ ...prev, [key]: value }));
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		
		if (!form.code.trim()) {
			setError(t("product.new.errors.codeRequired"));
			setSubmitting(false);
			return;
		}
		if (!form.name.trim()) {
			setError(t("product.new.errors.nameRequired"));
			setSubmitting(false);
			return;
		}
		
		try {
			const created = await productsApi.create(form);
			router.push(`/products/${created.id}`);
		} catch (e: any) {
			setError(e?.message ?? t("product.new.errors.createError"));
		} finally {
			setSubmitting(false);
		}
	}

	function categoryLabel(category: ProductCategory): string {
		return t(`product.new.categories.${category}`) || category;
	}

	function categoryDescription(category: ProductCategory): string {
		return t(`product.new.categoryDescriptions.${category}`) || "";
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/products" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("product.new.backToList")}
				</Link>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{t("product.new.title")}</h1>
						<p className="text-gray-600 mt-1">{t("product.new.subtitle")}</p>
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

			<form onSubmit={onSubmit} className="space-y-6">
				{/* Section 1: Informations de base */}
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">{t("product.new.sections.basicInfo")}</h2>
					</div>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t("product.new.fields.code")} <span className="text-red-500">*</span>
								</label>
								<Input
									value={form.code}
									onChange={e => update("code", e.target.value)}
									placeholder={t("product.new.fields.codePlaceholder")}
									required
									className="font-mono"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t("product.new.fields.category")} <span className="text-red-500">*</span>
								</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.category}
									onChange={e => update("category", e.target.value as ProductCategory)}
									required
								>
									<option value="CURRENT_ACCOUNT">{t("product.new.categories.CURRENT_ACCOUNT")}</option>
									<option value="SAVINGS_ACCOUNT">{t("product.new.categories.SAVINGS_ACCOUNT")}</option>
									<option value="TERM_DEPOSIT">{t("product.new.categories.TERM_DEPOSIT")}</option>
									<option value="LOAN">{t("product.new.categories.LOAN")}</option>
									<option value="CARD">{t("product.new.categories.CARD")}</option>
								</select>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("product.new.fields.name")} <span className="text-red-500">*</span>
							</label>
							<Input
								value={form.name}
								onChange={e => update("name", e.target.value)}
								placeholder={t("product.new.fields.namePlaceholder")}
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.new.fields.description")}</label>
							<textarea
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={form.description}
								onChange={e => update("description", e.target.value)}
								rows={3}
								placeholder={t("product.new.fields.descriptionPlaceholder")}
							/>
						</div>
					</div>
				</div>

				{/* Section 2: Paramètres financiers */}
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">{t("product.new.sections.financialSettings")}</h2>
					</div>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.new.fields.currency")}</label>
								<Input
									value={form.currency}
									onChange={e => update("currency", e.target.value.toUpperCase())}
									placeholder={t("product.new.fields.currencyPlaceholder")}
									maxLength={3}
									className="uppercase"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.new.fields.minBalance")}</label>
								<Input
									type="number"
									step="0.01"
									value={form.minBalance ?? ""}
									onChange={e => update("minBalance", e.target.value ? parseFloat(e.target.value) : undefined)}
									placeholder={t("product.new.fields.minBalancePlaceholder")}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.new.fields.maxBalance")}</label>
								<Input
									type="number"
									step="0.01"
									value={form.maxBalance ?? ""}
									onChange={e => update("maxBalance", e.target.value ? parseFloat(e.target.value) : undefined)}
									placeholder={t("product.new.fields.maxBalancePlaceholder")}
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.new.fields.defaultInterestRate")}</label>
							<Input
								type="number"
								step="0.0001"
								value={form.defaultInterestRate ?? ""}
								onChange={e => update("defaultInterestRate", e.target.value ? parseFloat(e.target.value) : undefined)}
								placeholder={t("product.new.fields.defaultInterestRatePlaceholder")}
							/>
						</div>
					</div>
				</div>

				{/* Informations contextuelles */}
				{form.category && (
					<div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 mb-1">{t("product.new.categoryInfo.title", { category: categoryLabel(form.category) })}</h3>
								<p className="text-sm text-gray-600">
									{categoryDescription(form.category)}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-3 pt-4">
					<Button type="submit" disabled={submitting} className="flex items-center gap-2">
						{submitting ? (
							<>
								<div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								{t("product.new.buttons.creating")}
							</>
						) : (
							<>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								{t("product.new.buttons.create")}
							</>
						)}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
						{t("product.new.buttons.cancel")}
					</Button>
				</div>
			</form>
		</div>
	);
}

