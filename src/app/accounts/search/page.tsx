"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { accountsApi } from "@/lib/api";
import type { Account } from "@/types";

export default function SearchAccountPage() {
	const router = useRouter();
	const [accountNumber, setAccountNumber] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [account, setAccount] = useState<Account | null>(null);

	async function handleSearch(e: React.FormEvent) {
		e.preventDefault();
		if (!accountNumber.trim()) {
			setError("Veuillez saisir un numéro de compte");
			return;
		}

		setLoading(true);
		setError(null);
		setAccount(null);

		try {
			const found = await accountsApi.getByAccountNumber(accountNumber.trim());
			setAccount(found);
			// Optionnel: rediriger vers la page de détail
			// router.push(`/accounts/${found.id}`);
		} catch (e: any) {
			setError(e?.message ?? "Compte non trouvé");
			setAccount(null);
		} finally {
			setLoading(false);
		}
	}

	function getStatusBadge(status: Account["status"]) {
		const colors: Record<Account["status"], string> = {
			ACTIVE: "bg-green-100 text-green-800",
			CLOSED: "bg-gray-100 text-gray-800",
			FROZEN: "bg-red-100 text-red-800",
			SUSPENDED: "bg-yellow-100 text-yellow-800"
		};
		const labels: Record<Account["status"], string> = {
			ACTIVE: "Actif",
			CLOSED: "Fermé",
			FROZEN: "Gelé",
			SUSPENDED: "Suspendu"
		};
		return (
			<span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
				{labels[status]}
			</span>
		);
	}

	function formatCurrency(amount: number, currency: string) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: currency
		}).format(amount);
	}

	return (
		<div className="max-w-2xl space-y-6">
			<div>
				<Link href="/accounts" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
					← Retour à la liste
				</Link>
				<h1 className="text-2xl font-bold">Rechercher un compte</h1>
				<p className="text-gray-600 mt-1">Rechercher un compte par son numéro</p>
			</div>

			<form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow space-y-4">
				<div>
					<label className="block text-sm font-medium mb-1">Numéro de compte *</label>
					<Input
						value={accountNumber}
						onChange={(e) => setAccountNumber(e.target.value)}
						placeholder="Ex: CUR-1234567890"
						required
						className="font-mono"
					/>
				</div>

				<Button type="submit" disabled={loading} className="w-full">
					{loading ? "Recherche..." : "Rechercher"}
				</Button>
			</form>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
					{error}
				</div>
			)}

			{account && (
				<div className="bg-white p-6 rounded-lg shadow space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">Compte trouvé</h2>
						<Link href={`/accounts/${account.id}`}>
							<Button variant="outline" size="sm">Voir les détails</Button>
						</Link>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<dt className="text-sm text-gray-600">Numéro de compte</dt>
							<dd className="font-mono font-semibold">{account.accountNumber}</dd>
						</div>
						<div>
							<dt className="text-sm text-gray-600">Statut</dt>
							<dd>{getStatusBadge(account.status)}</dd>
						</div>
						<div>
							<dt className="text-sm text-gray-600">Client</dt>
							<dd>
								{account.client ? (
									<Link href={`/customers/${account.clientId}`} className="text-blue-600 hover:underline">
										{account.client.displayName}
									</Link>
								) : (
									<span className="text-gray-400">-</span>
								)}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-gray-600">Produit</dt>
							<dd>
								{account.product ? (
									<Link href={`/products/${account.productId}`} className="text-blue-600 hover:underline">
										{account.product.name}
									</Link>
								) : (
									<span className="text-gray-400">-</span>
								)}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-gray-600">Solde</dt>
							<dd className="font-semibold">{formatCurrency(account.balance, account.currency)}</dd>
						</div>
						<div>
							<dt className="text-sm text-gray-600">Solde disponible</dt>
							<dd className="font-semibold">{formatCurrency(account.availableBalance, account.currency)}</dd>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

