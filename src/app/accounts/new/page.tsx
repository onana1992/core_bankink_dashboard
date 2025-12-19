"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { accountsApi, customersApi, productsApi } from "@/lib/api";
import type { Customer, Product, ProductPeriod, OpenProductRequest } from "@/types";

export default function NewAccountPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);

	const clientIdParam = searchParams.get("clientId");

	const [form, setForm] = useState<OpenProductRequest & { clientId: number | "" }>({
		clientId: clientIdParam ? Number(clientIdParam) : "",
		productId: 0,
		openingAmount: undefined,
		periodId: undefined,
		currency: undefined
	});

	useEffect(() => {
		async function load() {
			try {
				const [customersData, productsData] = await Promise.all([
					customersApi.list(),
					productsApi.list({ status: "ACTIVE" })
				]);
				setCustomers(customersData.filter(c => c.status === "VERIFIED"));
				setProducts(productsData);
			} catch (e: any) {
				setError(e?.message ?? "Erreur lors du chargement des données");
			}
		}
		load();
	}, []);

	useEffect(() => {
		async function loadPeriods() {
			if (form.productId) {
				try {
					const periodsData = await productsApi.getPeriods(form.productId);
					setPeriods(periodsData.filter(p => p.isActive));
				} catch (e) {
					console.error("Erreur lors du chargement des périodes:", e);
					setPeriods([]);
				}
			} else {
				setPeriods([]);
			}
		}
		loadPeriods();
	}, [form.productId]);

	const selectedProduct = products.find(p => p.id === form.productId);
	const selectedPeriod = periods.find(p => p.id === form.periodId);

	function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
		setForm(prev => {
			const updated = { ...prev, [key]: value };
			// Réinitialiser periodId si le produit change
			if (key === "productId") {
				updated.periodId = undefined;
			}
			return updated;
		});
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		if (!form.clientId || form.clientId === "") {
			setError("Le client est requis");
			setLoading(false);
			return;
		}

		if (!form.productId || form.productId === 0) {
			setError("Le produit est requis");
			setLoading(false);
			return;
		}

		const payload: OpenProductRequest = {
			productId: form.productId,
			openingAmount: form.openingAmount,
			periodId: form.periodId,
			currency: form.currency
		};

		try {
			const created = await accountsApi.openProduct(form.clientId, payload);
			router.push(`/accounts/${created.id}`);
		} catch (e: any) {
			setError(e?.message ?? "Échec de l'ouverture du compte");
		} finally {
			setLoading(false);
		}
	}

	const selectedClient = customers.find(c => c.id === form.clientId);

	return (
		<div className="max-w-2xl space-y-6">
			<div>
				<Link href="/accounts" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
					← Retour à la liste
				</Link>
				<h1 className="text-2xl font-bold">Ouvrir un compte</h1>
				<p className="text-gray-600 mt-1">Créer un nouveau compte bancaire pour un client</p>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
				{error}
			</div>
			)}

			<form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
				{/* Client */}
				<div>
					<label className="block text-sm font-medium mb-1">Client *</label>
					<select
						className="w-full px-3 py-2 border rounded-md"
						value={form.clientId}
						onChange={(e) => update("clientId", e.target.value ? Number(e.target.value) : "")}
						required
					>
						<option value="">Sélectionner un client</option>
						{customers.map(c => (
							<option key={c.id} value={c.id}>
								{c.displayName} {c.email ? `(${c.email})` : ""} - {c.status}
							</option>
						))}
					</select>
					{selectedClient && selectedClient.status !== "VERIFIED" && (
						<p className="text-red-600 text-sm mt-1">
							⚠️ Le client doit être vérifié (VERIFIED) pour ouvrir un compte
						</p>
					)}
				</div>

				{/* Produit */}
				<div>
					<label className="block text-sm font-medium mb-1">Produit *</label>
					<select
						className="w-full px-3 py-2 border rounded-md"
						value={form.productId}
						onChange={(e) => update("productId", Number(e.target.value))}
						required
					>
						<option value={0}>Sélectionner un produit</option>
						{products.map(p => (
							<option key={p.id} value={p.id}>
								{p.name} ({p.code}) - {p.category}
							</option>
						))}
					</select>
					{selectedProduct && (
						<div className="mt-2 text-sm text-gray-600">
							<p>{selectedProduct.description}</p>
							{selectedProduct.minBalance !== null && selectedProduct.minBalance !== undefined && (
								<p>Montant minimum: {selectedProduct.minBalance} {selectedProduct.currency}</p>
							)}
							{selectedProduct.maxBalance !== null && selectedProduct.maxBalance !== undefined && (
								<p>Montant maximum: {selectedProduct.maxBalance} {selectedProduct.currency}</p>
							)}
						</div>
					)}
				</div>

				{/* Période (si applicable) */}
				{periods.length > 0 && (
					<div>
						<label className="block text-sm font-medium mb-1">Période</label>
						<select
							className="w-full px-3 py-2 border rounded-md"
							value={form.periodId ?? ""}
							onChange={(e) => update("periodId", e.target.value ? Number(e.target.value) : undefined)}
						>
							<option value="">Aucune période</option>
							{periods.map(p => (
								<option key={p.id} value={p.id}>
									{p.periodName} {p.interestRate ? `(${p.interestRate}%)` : ""}
									{p.minAmount ? ` - Min: ${p.minAmount}` : ""}
									{p.maxAmount ? ` Max: ${p.maxAmount}` : ""}
								</option>
							))}
						</select>
						{selectedPeriod && (
							<div className="mt-2 text-sm text-gray-600">
								{selectedPeriod.interestRate && (
									<p>Taux d'intérêt: {selectedPeriod.interestRate}%</p>
								)}
								{selectedPeriod.periodDays && (
									<p>Durée: {selectedPeriod.periodDays} jours</p>
								)}
							</div>
						)}
					</div>
				)}

				{/* Montant d'ouverture */}
				<div>
					<label className="block text-sm font-medium mb-1">Montant d'ouverture</label>
					<Input
						type="number"
						step="0.01"
						min="0"
						value={form.openingAmount ?? ""}
						onChange={(e) => update("openingAmount", e.target.value ? Number(e.target.value) : undefined)}
						placeholder="0.00"
					/>
					{selectedProduct && (
						<p className="text-xs text-gray-500 mt-1">
							Devise: {selectedProduct.currency}
							{selectedProduct.minBalance !== null && ` | Min: ${selectedProduct.minBalance}`}
							{selectedProduct.maxBalance !== null && ` | Max: ${selectedProduct.maxBalance}`}
						</p>
					)}
				</div>

				{/* Devise */}
				<div>
					<label className="block text-sm font-medium mb-1">Devise</label>
					<Input
						value={form.currency ?? selectedProduct?.currency ?? "USD"}
						onChange={(e) => update("currency", e.target.value || undefined)}
						placeholder="USD"
						maxLength={3}
					/>
					<p className="text-xs text-gray-500 mt-1">Code ISO-3 (ex: USD, EUR, XOF). Par défaut: devise du produit</p>
				</div>

				<div className="flex gap-4 pt-4">
					<Link href="/accounts">
						<Button type="button" variant="outline">Annuler</Button>
					</Link>
					<Button type="submit" disabled={loading || !form.clientId || !form.productId}>
						{loading ? "Ouverture..." : "Ouvrir le compte"}
					</Button>
				</div>
			</form>
		</div>
	);
}

