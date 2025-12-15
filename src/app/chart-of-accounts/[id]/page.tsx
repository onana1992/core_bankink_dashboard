"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { chartOfAccountsApi } from "@/lib/api";
import type { ChartOfAccount, AccountType, UpdateChartOfAccountRequest } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function ChartOfAccountDetailPage() {
	const params = useParams();
	const router = useRouter();
	const accountId = params.id as string;
	const [account, setAccount] = useState<ChartOfAccount | null>(null);
	const [children, setChildren] = useState<ChartOfAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showEditForm, setShowEditForm] = useState(false);
	const [editForm, setEditForm] = useState<UpdateChartOfAccountRequest>({
		name: "",
		description: "",
		category: "",
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (accountId) {
			loadAccount();
		}
	}, [accountId]);

	useEffect(() => {
		if (account && showEditForm) {
			setEditForm({
				name: account.name,
				description: account.description || "",
				category: account.category || "",
				isActive: account.isActive
			});
			setValidationErrors({});
		}
	}, [account, showEditForm]);

	async function loadAccount() {
		setLoading(true);
		setError(null);
		try {
			const data = await chartOfAccountsApi.get(accountId);
			setAccount(data);
			if (data.code) {
				try {
					const childrenData = await chartOfAccountsApi.getChildren(data.code);
					setChildren(childrenData);
				} catch (e) {
					// Ignorer l'erreur si pas d'enfants
					setChildren([]);
				}
			}
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement du compte comptable");
		} finally {
			setLoading(false);
		}
	}

	function getAccountTypeLabel(type: AccountType): string {
		const labels: Record<AccountType, string> = {
			ASSET: "Actif",
			LIABILITY: "Passif",
			EQUITY: "Capitaux propres",
			REVENUE: "Produit",
			EXPENSE: "Charge"
		};
		return labels[type] || type;
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
			errors.name = "Le nom est requis";
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
			await chartOfAccountsApi.update(account.id, editForm);
			setShowEditForm(false);
			loadAccount();
		} catch (e: any) {
			const errorMessage = e?.message || "Erreur lors de la modification";
			setError(errorMessage);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleToggleActive() {
		if (!account) return;
		try {
			await chartOfAccountsApi.update(account.id, {
				isActive: !account.isActive
			});
			loadAccount();
		} catch (e: any) {
			alert(e?.message || "Erreur lors de la modification");
		}
	}

	async function handleDelete() {
		if (!account) return;
		if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte comptable "${account.name}" ?\n\nCette action est irréversible.`)) {
			return;
		}
		try {
			await chartOfAccountsApi.delete(account.id);
			router.push("/chart-of-accounts");
		} catch (e: any) {
			alert(e?.message || "Erreur lors de la suppression");
		}
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">Chargement du compte comptable...</p>
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
						<div className="font-medium">Erreur</div>
						<div className="text-sm mt-1">{error ?? "Compte comptable non trouvé"}</div>
					</div>
				</div>
				<Link href="/chart-of-accounts">
					<Button className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						Retour à la liste
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav className="flex items-center gap-2 text-sm text-gray-600">
				<Link href="/chart-of-accounts" className="hover:text-gray-900">
					Plan Comptable
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
							<Badge variant={account.isActive ? "success" : "neutral"}>
								{account.isActive ? "Actif" : "Inactif"}
							</Badge>
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button onClick={loadAccount} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Actualiser
					</Button>
					<Button onClick={() => setShowEditForm(!showEditForm)} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						{showEditForm ? "Annuler" : "Modifier"}
					</Button>
					<Button onClick={handleToggleActive} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={account.isActive ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
						</svg>
						{account.isActive ? "Désactiver" : "Activer"}
					</Button>
					<Button onClick={handleDelete} variant="outline" className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Supprimer
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

			{/* Formulaire de modification */}
			{showEditForm && (
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold text-gray-900">Modifier le compte comptable</h2>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								setShowEditForm(false);
								setValidationErrors({});
							}}
						>
							✕
						</Button>
					</div>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
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
							<div className="col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={editForm.description || ""}
									onChange={e => setEditForm({ ...editForm, description: e.target.value })}
									rows={3}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
								<Input
									value={editForm.category || ""}
									onChange={e => setEditForm({ ...editForm, category: e.target.value })}
									maxLength={50}
								/>
							</div>
							<div>
								<label className="flex items-center gap-2 pt-8">
									<input
										type="checkbox"
										checked={editForm.isActive ?? true}
										onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
										className="rounded"
									/>
									<span className="text-sm text-gray-700">Actif</span>
								</label>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-4">
							<Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
								Annuler
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting ? "Modification..." : "Enregistrer"}
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* Informations principales */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Informations générales
					</h3>
					<dl className="space-y-4">
						<div>
							<dt className="text-sm font-medium text-gray-500">Description</dt>
							<dd className="mt-1 text-sm text-gray-900">{account.description || "-"}</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-gray-500">Catégorie</dt>
							<dd className="mt-1 text-sm text-gray-900">{account.category || "-"}</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-gray-500">Niveau</dt>
							<dd className="mt-1 text-sm text-gray-900">{account.level}</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-gray-500">Compte parent</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{account.parentCode ? (
									<Link href={`/chart-of-accounts/by-code/${account.parentCode}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono">
										{account.parentCode}
									</Link>
								) : (
									<span className="text-gray-400">Aucun (compte racine)</span>
								)}
							</dd>
						</div>
					</dl>
				</div>

				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Dates et historique
					</h3>
					<dl className="space-y-4">
						<div>
							<dt className="text-sm font-medium text-gray-500">Créé le</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{account.createdAt ? new Date(account.createdAt).toLocaleString("fr-FR") : "-"}
							</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-gray-500">Modifié le</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{account.updatedAt ? new Date(account.updatedAt).toLocaleString("fr-FR") : "-"}
							</dd>
						</div>
						{account.createdBy && (
							<div>
								<dt className="text-sm font-medium text-gray-500">Créé par</dt>
								<dd className="mt-1 text-sm text-gray-900">Utilisateur #{account.createdBy}</dd>
							</div>
						)}
					</dl>
				</div>
			</div>

			{/* Sous-comptes */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
						<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						Sous-comptes ({children.length})
					</h2>
				</div>
				{children.length === 0 ? (
					<div className="p-12 text-center">
						<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						<p className="text-gray-500 text-lg font-medium">Aucun sous-compte</p>
						<p className="text-gray-400 text-sm mt-2">Ce compte n'a pas de sous-comptes associés</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-48 max-w-xs">Nom</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Niveau</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{children.map(child => (
									<tr key={child.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{child.code}</span>
										</td>
										<td className="px-6 py-4 w-48 max-w-xs break-words">
											<Link href={`/chart-of-accounts/${child.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
												{child.name}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={getAccountTypeBadgeVariant(child.accountType)}>
												{getAccountTypeLabel(child.accountType)}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{child.level}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={child.isActive ? "success" : "neutral"}>
												{child.isActive ? "Actif" : "Inactif"}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/chart-of-accounts/${child.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													Voir
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
