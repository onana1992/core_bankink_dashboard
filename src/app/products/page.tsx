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

	// Filtres
	const [q, setQ] = useState("");
	const [filterStatus, setFilterStatus] = useState<"ALL" | ProductStatus>("ALL");
	const [filterCategory, setFilterCategory] = useState<"ALL" | ProductCategory>("ALL");

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const params: { category?: ProductCategory; status?: ProductStatus } = {};
			if (filterCategory !== "ALL") params.category = filterCategory;
			if (filterStatus !== "ALL") params.status = filterStatus;
			const data = await productsApi.list(params);
			setProducts(data);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des produits");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [filterCategory, filterStatus]);

	const stats = useMemo(() => {
		const total = products.length;
		const byStatus: Record<string, number> = {};
		const byCategory: Record<string, number> = {};
		for (const p of products) {
			byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
			byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
		}
		return {
			total,
			active: byStatus["ACTIVE"] ?? 0,
			inactive: byStatus["INACTIVE"] ?? 0,
			draft: byStatus["DRAFT"] ?? 0
		};
	}, [products]);

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
		const labels: Record<ProductCategory, string> = {
			CURRENT_ACCOUNT: "Compte courant",
			SAVINGS_ACCOUNT: "Compte épargne",
			TERM_DEPOSIT: "Dépôt à terme",
			LOAN: "Prêt",
			CARD: "Carte"
		};
		return labels[category] || category;
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
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Catalogue de produits</h1>
				<div className="flex gap-2">
					<Button onClick={load} variant="outline">Actualiser</Button>
					<Link href="/products/new">
						<Button>+ Nouveau produit</Button>
					</Link>
				</div>
			</div>

			{error && <div className="text-sm text-red-600">{error}</div>}

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="rounded-md border bg-gray-50 border-gray-200 p-4">
					<div className="text-xs text-gray-500">Total</div>
					<div className="mt-1 text-2xl font-semibold">{stats.total}</div>
				</div>
				<div className="rounded-md border bg-emerald-50 border-emerald-200 p-4">
					<div className="text-xs text-gray-500">Actifs</div>
					<div className="mt-1 text-2xl font-semibold">{stats.active}</div>
				</div>
				<div className="rounded-md border bg-amber-50 border-amber-200 p-4">
					<div className="text-xs text-gray-500">Brouillons</div>
					<div className="mt-1 text-2xl font-semibold">{stats.draft}</div>
				</div>
				<div className="rounded-md border bg-rose-50 border-rose-200 p-4">
					<div className="text-xs text-gray-500">Inactifs</div>
					<div className="mt-1 text-2xl font-semibold">{stats.inactive}</div>
				</div>
			</div>

			{/* Filtres */}
			<div className="rounded-md border bg-white p-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
					<div className="md:col-span-2">
						<label className="block text-sm mb-1 text-gray-600">Recherche</label>
						<Input
							placeholder="Nom, code ou description..."
							value={q}
							onChange={e => setQ(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1 text-gray-600">Statut</label>
						<select
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={filterStatus}
							onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
						>
							<option value="ALL">Tous</option>
							<option value="ACTIVE">Actif</option>
							<option value="DRAFT">Brouillon</option>
							<option value="INACTIVE">Inactif</option>
						</select>
					</div>
					<div>
						<label className="block text-sm mb-1 text-gray-600">Catégorie</label>
						<select
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={filterCategory}
							onChange={e => setFilterCategory(e.target.value as typeof filterCategory)}
						>
							<option value="ALL">Toutes</option>
							<option value="CURRENT_ACCOUNT">Compte courant</option>
							<option value="SAVINGS_ACCOUNT">Compte épargne</option>
							<option value="TERM_DEPOSIT">Dépôt à terme</option>
							<option value="LOAN">Prêt</option>
							<option value="CARD">Carte</option>
						</select>
					</div>
				</div>
				<div className="mt-3 flex gap-2">
					<Button variant="outline" onClick={() => { setQ(""); setFilterStatus("ALL"); setFilterCategory("ALL"); }}>
						Réinitialiser
					</Button>
				</div>
			</div>

			<div className="overflow-x-auto rounded-md border bg-white">
				<table className="min-w-full text-sm">
					<thead className="bg-gray-50">
						<tr className="text-left">
							<th className="px-4 py-2">Code</th>
							<th className="px-4 py-2">Nom</th>
							<th className="px-4 py-2">Catégorie</th>
							<th className="px-4 py-2">Statut</th>
							<th className="px-4 py-2">Devise</th>
							<th className="px-4 py-2">Taux d'intérêt</th>
							<th className="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{loading && (
							<tr>
								<td className="px-4 py-3" colSpan={7}>Chargement...</td>
							</tr>
						)}
						{!loading && filteredProducts.length === 0 && (
							<tr>
								<td className="px-4 py-6 text-gray-500" colSpan={7}>
									Aucun produit trouvé
								</td>
							</tr>
						)}
						{filteredProducts.map(p => (
							<tr key={p.id} className="border-t">
								<td className="px-4 py-3 font-mono text-xs">{p.code}</td>
								<td className="px-4 py-3">{p.name}</td>
								<td className="px-4 py-3">{categoryLabel(p.category)}</td>
								<td className="px-4 py-3">
									<Badge variant={statusBadgeVariant(p.status)}>{p.status}</Badge>
								</td>
								<td className="px-4 py-3">{p.currency}</td>
								<td className="px-4 py-3">
									{p.defaultInterestRate != null ? `${p.defaultInterestRate}%` : "-"}
								</td>
								<td className="px-4 py-3">
									<Link href={`/products/${p.id}`}>
										<Button size="sm" variant="ghost">Voir</Button>
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

