"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { chartOfAccountsApi } from "@/lib/api";
import type { ChartOfAccount } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function ChartOfAccountsPage() {
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Ne charger les données que si l'utilisateur est authentifié et que le chargement est terminé
		if (authLoading) return;
		if (!isAuthenticated) return;
		
		loadAccounts();
	}, [authLoading, isAuthenticated]);

	const loadAccounts = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await chartOfAccountsApi.list();
			setAccounts(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur lors du chargement");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">Plan Comptable</h1>
				<Button onClick={() => router.push("/chart-of-accounts/new")}>
					Nouveau Compte
				</Button>
			</div>

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<div>Chargement...</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full bg-white border border-gray-200">
						<thead>
							<tr>
								<th className="px-4 py-2 border-b">Code</th>
								<th className="px-4 py-2 border-b">Nom</th>
								<th className="px-4 py-2 border-b">Type</th>
								<th className="px-4 py-2 border-b">Statut</th>
								<th className="px-4 py-2 border-b">Actions</th>
							</tr>
						</thead>
						<tbody>
							{accounts.map((account) => (
								<tr key={account.id}>
									<td className="px-4 py-2 border-b">{account.code}</td>
									<td className="px-4 py-2 border-b">{account.name}</td>
									<td className="px-4 py-2 border-b">{account.accountType}</td>
									<td className="px-4 py-2 border-b">
										<Badge variant={account.isActive ? "success" : "danger"}>
											{account.isActive ? "Actif" : "Inactif"}
										</Badge>
									</td>
									<td className="px-4 py-2 border-b">
										<Link href={`/chart-of-accounts/${account.id}`}>
											<Button variant="outline" size="sm">Voir</Button>
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
