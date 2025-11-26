"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { productsApi } from "@/lib/api";
import type { CreateProductRequest, ProductCategory } from "@/types";

export default function NewProductPage() {
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
			setError("Le code est requis");
			setSubmitting(false);
			return;
		}
		if (!form.name.trim()) {
			setError("Le nom est requis");
			setSubmitting(false);
			return;
		}
		
		try {
			const created = await productsApi.create(form);
			router.push(`/products/${created.id}`);
		} catch (e: any) {
			setError(e?.message ?? "Échec de création");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="max-w-2xl space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Nouveau produit</h1>
			</div>

			<form onSubmit={onSubmit} className="space-y-4 rounded-md border bg-white p-4">
				{error && (
					<div className="p-3 bg-red-50 border border-red-200 rounded-md">
						<div className="text-sm font-medium text-red-800">Erreur</div>
						<div className="text-sm text-red-600 mt-1">{error}</div>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm mb-1">
							Code <span className="text-red-500">*</span>
						</label>
						<Input
							value={form.code}
							onChange={e => update("code", e.target.value)}
							placeholder="PROD-001"
							required
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">
							Catégorie <span className="text-red-500">*</span>
						</label>
						<select
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={form.category}
							onChange={e => update("category", e.target.value as ProductCategory)}
							required
						>
							<option value="CURRENT_ACCOUNT">Compte courant</option>
							<option value="SAVINGS_ACCOUNT">Compte épargne</option>
							<option value="TERM_DEPOSIT">Dépôt à terme</option>
							<option value="LOAN">Prêt</option>
							<option value="CARD">Carte</option>
						</select>
					</div>
				</div>

				<div>
					<label className="block text-sm mb-1">
						Nom <span className="text-red-500">*</span>
					</label>
					<Input
						value={form.name}
						onChange={e => update("name", e.target.value)}
						placeholder="Nom du produit"
						required
					/>
				</div>

				<div>
					<label className="block text-sm mb-1">Description</label>
					<textarea
						className="w-full rounded-md border bg-white px-3 py-2 text-sm"
						value={form.description}
						onChange={e => update("description", e.target.value)}
						rows={3}
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm mb-1">Devise</label>
						<Input
							value={form.currency}
							onChange={e => update("currency", e.target.value.toUpperCase())}
							placeholder="USD"
							maxLength={3}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Solde minimum</label>
						<Input
							type="number"
							step="0.01"
							value={form.minBalance ?? ""}
							onChange={e => update("minBalance", e.target.value ? parseFloat(e.target.value) : undefined)}
							placeholder="0.00"
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Solde maximum</label>
						<Input
							type="number"
							step="0.01"
							value={form.maxBalance ?? ""}
							onChange={e => update("maxBalance", e.target.value ? parseFloat(e.target.value) : undefined)}
							placeholder="0.00"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm mb-1">Taux d'intérêt par défaut (%)</label>
					<Input
						type="number"
						step="0.0001"
						value={form.defaultInterestRate ?? ""}
						onChange={e => update("defaultInterestRate", e.target.value ? parseFloat(e.target.value) : undefined)}
						placeholder="0.0000"
					/>
				</div>

				<div className="flex gap-2 pt-4">
					<Button type="submit" disabled={submitting}>
						{submitting ? "Création..." : "Créer"}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Annuler
					</Button>
				</div>
			</form>
		</div>
	);
}

