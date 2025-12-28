"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { productsApi } from "@/lib/api";
import type { Product, ProductCategory, ProductStatus } from "@/types";

export default function ProductsPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);

	// Filtres
	const [q, setQ] = useState("");
	const [filterStatus, setFilterStatus] = useState<"ALL" | ProductStatus>("ALL");
	const [filterCategory, setFilterCategory] = useState<"ALL" | ProductCategory>("ALL");

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const params: { category?: ProductCategory; status?: ProductStatus; page?: number; size?: number } = {};
			if (filterCategory !== "ALL") params.category = filterCategory;
			if (filterStatus !== "ALL") params.status = filterStatus;
			params.page = page;
			params.size = size;
			const response = await productsApi.list(params);
			setProducts(response.content);
			setTotalPages(response.totalPages);
			setTotalElements(response.totalElements);
		} catch (e: any) {
			setError(e?.message ?? t("product.list.errors.loadError"));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [filterCategory, filterStatus, page, size]);

	const stats = useMemo(() => {
		const byStatus: Record<string, number> = {};
		const byCategory: Record<string, number> = {};
		for (const p of products) {
			byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
			byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
		}
		return {
			total: totalElements,
			active: byStatus["ACTIVE"] ?? 0,
			inactive: byStatus["INACTIVE"] ?? 0,
			draft: byStatus["DRAFT"] ?? 0
		};
	}, [products, totalElements]);

	function statusBadgeVariant(status: ProductStatus): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (status) {
			case "ACTIVE":
				return "success";
			case "DRAFT":
				return "warning";
			case "INACTIVE":
				return "danger";
			default:
				return "neutral";
		}
	}

	function categoryLabel(category: ProductCategory): string {
		return t(`product.detail.categories.${category}`);
	}

	const filteredProducts = useMemo(() => {
		const query = q.trim().toLowerCase();
		return products.filter(p => {
			if (query) {
				const hay = `${p.name ?? ""} ${p.code ?? ""} ${p.description ?? ""}`.toLowerCase();
				if (!hay.includes(query)) return false;
			}
			return true;
		});
	}, [products, q]);

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("product.list.title")}</h1>
					<p className="text-gray-600 mt-1">{t("product.list.subtitle")}</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={load} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("product.list.refresh")}
					</Button>
					<Link href="/products/new">
						<Button className="flex items-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							{t("product.list.new")}
						</Button>
					</Link>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("product.list.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">{t("product.list.stats.active")}</div>
							<div className="text-3xl font-bold text-green-900">{stats.active}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">{t("product.list.stats.draft")}</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.draft}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">{t("product.list.stats.inactive")}</div>
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
					<h2 className="text-lg font-semibold text-gray-900">{t("product.list.filters.title")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.list.filters.search")}</label>
						<div className="relative">
							<Input
								placeholder={t("product.list.filters.searchPlaceholder")}
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
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.list.filters.status")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => {
								setFilterStatus(e.target.value as "ALL" | ProductStatus);
								setPage(0); // Reset to first page when filter changes
							}}
						>
							<option value="ALL">{t("product.list.filters.statusAll")}</option>
							<option value="ACTIVE">{t("product.detail.statuses.ACTIVE")}</option>
							<option value="DRAFT">{t("product.detail.statuses.DRAFT")}</option>
							<option value="INACTIVE">{t("product.detail.statuses.INACTIVE")}</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("product.list.filters.category")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterCategory}
							onChange={(e) => {
								setFilterCategory(e.target.value as "ALL" | ProductCategory);
								setPage(0); // Reset to first page when filter changes
							}}
						>
							<option value="ALL">{t("product.list.filters.categoryAll")}</option>
							<option value="CURRENT_ACCOUNT">{t("product.detail.categories.CURRENT_ACCOUNT")}</option>
							<option value="SAVINGS_ACCOUNT">{t("product.detail.categories.SAVINGS_ACCOUNT")}</option>
							<option value="TERM_DEPOSIT">{t("product.detail.categories.TERM_DEPOSIT")}</option>
							<option value="LOAN">{t("product.detail.categories.LOAN")}</option>
							<option value="CARD">{t("product.detail.categories.CARD")}</option>
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

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">{t("product.list.loading")}</p>
				</div>
			) : filteredProducts.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("product.list.empty.title")}</p>
					<p className="text-gray-400 text-sm mt-2">{t("product.list.empty.message")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("product.list.table.code")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("product.list.table.name")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("product.list.table.category")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("product.list.table.status")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("product.list.table.currency")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("product.list.table.interestRate")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("product.list.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredProducts.map(product => (
									<tr key={product.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{product.code}</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link href={`/products/${product.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
												{product.name}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{categoryLabel(product.category)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={statusBadgeVariant(product.status)}>{t(`product.detail.statuses.${product.status}`)}</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
												{product.currency}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{product.defaultInterestRate != null ? `${product.defaultInterestRate}%` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/products/${product.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("product.list.table.view")}
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(filteredProducts.length > 0 || totalElements > 0) && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
							<div className="flex items-center gap-4">
								<p className="text-sm text-gray-600">
									{t("product.list.pagination.showing")} <span className="font-semibold">{filteredProducts.length}</span> {t("product.list.pagination.of")} <span className="font-semibold">{totalElements}</span> {totalElements > 1 ? t("product.list.pagination.products") : t("product.list.pagination.product")}
								</p>
								<div className="flex items-center gap-2">
									<label className="text-sm text-gray-600">{t("product.list.pagination.itemsPerPage")}</label>
									<select
										className="px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
										value={size}
										onChange={(e) => {
											setSize(Number(e.target.value));
											setPage(0); // Reset to first page when size changes
										}}
									>
										<option value="10">10</option>
										<option value="20">20</option>
										<option value="50">50</option>
										<option value="100">100</option>
									</select>
								</div>
							</div>
							{totalPages > 1 && (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage(p => Math.max(0, p - 1))}
										disabled={page === 0}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
										</svg>
									</Button>
									<span className="text-sm text-gray-600">
										{t("product.list.pagination.page")} {page + 1} {t("product.list.pagination.on")} {totalPages}
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
										disabled={page >= totalPages - 1}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</Button>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

