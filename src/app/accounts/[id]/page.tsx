"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { accountsApi, customersApi, productsApi } from "@/lib/api";
import type { Account, AccountStatus, Customer, Product } from "@/types";

export default function AccountDetailPage() {
	const params = useParams();
	const router = useRouter();
	const accountId = params.id as string;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [account, setAccount] = useState<Account | null>(null);
	const [client, setClient] = useState<Customer | null>(null);
	const [product, setProduct] = useState<Product | null>(null);

	// Actions
	const [actionLoading, setActionLoading] = useState(false);
	const [showCloseModal, setShowCloseModal] = useState(false);
	const [showFreezeModal, setShowFreezeModal] = useState(false);
	const [showSuspendModal, setShowSuspendModal] = useState(false);
	const [closeReason, setCloseReason] = useState("");
	const [freezeReason, setFreezeReason] = useState("");
	const [suspendReason, setSuspendReason] = useState("");

	async function load() {
		setLoading(true);
		setError(null);
		setClient(null);
		setProduct(null);
		
		try {
			const accountData = await accountsApi.get(accountId);
			setAccount(accountData);
			
			// Charger les détails du client et du produit en parallèle
			const promises: Promise<any>[] = [];
			
			if (accountData.clientId) {
				promises.push(
					customersApi.get(accountData.clientId)
						.then(clientData => setClient(clientData))
						.catch(e => {
							// Ne pas bloquer l'affichage si le client ne peut pas être chargé
						})
				);
			}
			
			if (accountData.productId) {
				promises.push(
					productsApi.get(accountData.productId)
						.then(productData => setProduct(productData))
						.catch(e => {
							// Ne pas bloquer l'affichage si le produit ne peut pas être chargé
						})
				);
			}
			
			// Attendre que tous les chargements soient terminés
			await Promise.allSettled(promises);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement du compte");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (accountId) {
			load();
		}
	}, [accountId]);

	async function handleClose() {
		if (!closeReason.trim()) {
			alert("Le motif de fermeture est requis");
			return;
		}
		setActionLoading(true);
		try {
			await accountsApi.close(accountId, { reason: closeReason });
			setShowCloseModal(false);
			setCloseReason("");
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la fermeture du compte");
		} finally {
			setActionLoading(false);
		}
	}

	async function handleFreeze() {
		setActionLoading(true);
		try {
			await accountsApi.freeze(accountId, freezeReason ? { reason: freezeReason } : undefined);
			setShowFreezeModal(false);
			setFreezeReason("");
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors du gel du compte");
		} finally {
			setActionLoading(false);
		}
	}

	async function handleUnfreeze() {
		if (!confirm("Êtes-vous sûr de vouloir dégeler ce compte ?")) return;
		setActionLoading(true);
		try {
			await accountsApi.unfreeze(accountId);
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors du dégel du compte");
		} finally {
			setActionLoading(false);
		}
	}

	async function handleSuspend() {
		setActionLoading(true);
		try {
			await accountsApi.suspend(accountId, suspendReason ? { reason: suspendReason } : undefined);
			setShowSuspendModal(false);
			setSuspendReason("");
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suspension du compte");
		} finally {
			setActionLoading(false);
		}
	}

	async function handleUnsuspend() {
		if (!confirm("Êtes-vous sûr de vouloir réactiver ce compte ?")) return;
		setActionLoading(true);
		try {
			await accountsApi.unsuspend(accountId);
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la réactivation du compte");
		} finally {
			setActionLoading(false);
		}
	}

	function getStatusBadge(status: AccountStatus) {
		const colors: Record<AccountStatus, string> = {
			ACTIVE: "bg-green-100 text-green-800",
			CLOSED: "bg-gray-100 text-gray-800",
			FROZEN: "bg-red-100 text-red-800",
			SUSPENDED: "bg-yellow-100 text-yellow-800"
		};
		const labels: Record<AccountStatus, string> = {
			ACTIVE: "Actif",
			CLOSED: "Fermé",
			FROZEN: "Gelé",
			SUSPENDED: "Suspendu"
		};
		return <Badge className={colors[status]}>{labels[status]}</Badge>;
	}

	function formatCurrency(amount: number, currency: string) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: currency
		}).format(amount);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
					<p className="text-gray-600">Chargement des informations du compte...</p>
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
						<div className="text-sm mt-1">{error ?? "Compte non trouvé"}</div>
					</div>
				</div>
				<Link href="/accounts">
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
			{/* En-tête amélioré */}
			<div>
				<Link href="/accounts" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des comptes
				</Link>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
							</svg>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Compte {account.accountNumber}</h1>
							<p className="text-gray-600 mt-1">Détails et gestion du compte bancaire</p>
						</div>
					</div>
					<div className="flex gap-2">
						{account.status === "ACTIVE" && (
							<>
								<Button variant="outline" onClick={() => setShowFreezeModal(true)} className="flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
									</svg>
									Geler
								</Button>
								<Button variant="outline" onClick={() => setShowSuspendModal(true)} className="flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									Suspendre
								</Button>
								<Button variant="outline" onClick={() => setShowCloseModal(true)} className="flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
									Fermer
								</Button>
							</>
						)}
						{account.status === "FROZEN" && (
							<Button variant="outline" onClick={handleUnfreeze} disabled={actionLoading} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
								</svg>
								Dégeler
							</Button>
						)}
						{account.status === "SUSPENDED" && (
							<Button variant="outline" onClick={handleUnsuspend} disabled={actionLoading} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Réactiver
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Informations principales */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Carte Informations du compte améliorée */}
				<div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
					{/* En-tête avec icône */}
					<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-bold text-white">Informations du compte</h2>
								<p className="text-xs text-blue-100">Détails et soldes</p>
							</div>
						</div>
					</div>

					{/* Contenu */}
					<div className="p-6 space-y-5">
						{/* Numéro de compte - Mise en avant */}
						<div className="bg-white rounded-lg p-4 border border-blue-100">
							<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
								<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
								</svg>
								Numéro de compte
							</dt>
							<dd className="font-mono font-bold text-xl text-gray-900 mt-1">{account.accountNumber}</dd>
						</div>

						{/* Statut - Badge amélioré */}
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Statut
							</dt>
							<dd>{getStatusBadge(account.status)}</dd>
						</div>

						{/* Soldes - Mise en avant visuelle */}
						<div className="grid grid-cols-2 gap-3">
							<div className="bg-white rounded-lg p-4 border border-green-200">
								<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Solde comptable
								</dt>
								<dd className="font-bold text-xl text-gray-900">{formatCurrency(account.balance, account.currency)}</dd>
							</div>
							<div className="bg-white rounded-lg p-4 border border-blue-200">
								<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
									</svg>
									Disponible
								</dt>
								<dd className="font-bold text-xl text-blue-700">{formatCurrency(account.availableBalance, account.currency)}</dd>
							</div>
						</div>

						{/* Informations supplémentaires */}
						<div className="space-y-3 pt-3 border-t border-gray-200">
							<div className="flex items-center justify-between py-2">
								<dt className="text-sm text-gray-600 flex items-center gap-2">
									<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
									</svg>
									Devise
								</dt>
								<dd className="font-semibold">
									<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
										{account.currency}
									</span>
								</dd>
							</div>

							{account.openingAmount && (
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
										</svg>
										Montant d'ouverture
									</dt>
									<dd className="font-semibold text-gray-900">{formatCurrency(account.openingAmount, account.currency)}</dd>
								</div>
							)}

							{account.interestRate !== null && account.interestRate !== undefined && (
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										Taux d'intérêt
									</dt>
									<dd className="font-semibold text-green-700">
										<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
											{account.interestRate.toFixed(2)}%
										</span>
									</dd>
								</div>
							)}

							{account.maturityDate && (
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date d'échéance
									</dt>
									<dd className="font-semibold text-gray-900">
										{new Date(account.maturityDate).toLocaleDateString('fr-FR', { 
											day: 'numeric', 
											month: 'long', 
											year: 'numeric' 
										})}
									</dd>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Carte Informations client */}
				<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
								<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
							</div>
							<h2 className="text-lg font-bold text-gray-900">Informations client</h2>
						</div>
					</div>
					<div className="p-6">
						{/* Utiliser les données du client chargé ou celles de account.client */}
						{(client || (account.client && account.clientId)) ? (
							<dl className="space-y-4">
								<div>
									<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client</dt>
									<dd>
										<Link 
											href={`/customers/${client?.id || account.client?.id || account.clientId}`} 
											className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-lg"
										>
											{client?.displayName || account.client?.displayName || "Client"}
										</Link>
									</dd>
								</div>
								{(client?.email || account.client?.email) && (
									<div className="flex items-center justify-between py-2 border-t border-gray-100">
										<dt className="text-sm text-gray-600 flex items-center gap-2">
											<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
											</svg>
											Email
										</dt>
										<dd className="font-medium">{client?.email || account.client?.email}</dd>
									</div>
								)}
								{client?.phone && (
									<div className="flex items-center justify-between py-2 border-t border-gray-100">
										<dt className="text-sm text-gray-600 flex items-center gap-2">
											<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
											</svg>
											Téléphone
										</dt>
										<dd className="font-medium">{client.phone}</dd>
									</div>
								)}
								{client?.status && (
									<div className="flex items-center justify-between py-2 border-t border-gray-100">
										<dt className="text-sm text-gray-600 flex items-center gap-2">
											<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
											</svg>
											Statut KYC
										</dt>
										<dd>
											<Badge className={client.status === "VERIFIED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
												{client.status}
											</Badge>
										</dd>
									</div>
								)}
								{account.clientId && !client && (
									<div className="pt-2 border-t border-gray-100">
										<p className="text-xs text-gray-500 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Informations limitées - Chargement complet en cours...
										</p>
									</div>
								)}
							</dl>
						) : account.clientId ? (
							<div className="space-y-3">
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<div className="flex items-start gap-2">
										<svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
										</svg>
										<div className="flex-1">
											<p className="text-sm font-medium text-yellow-800">Chargement en cours</p>
											<p className="text-xs text-yellow-700 mt-1">Les informations du client sont en cours de chargement...</p>
										</div>
									</div>
								</div>
								<div className="text-center">
									<Link href={`/customers/${account.clientId}`} className="text-blue-600 hover:underline text-sm">
										Voir le client #{account.clientId} →
									</Link>
								</div>
							</div>
						) : (
							<p className="text-gray-400 text-center py-4">Aucune information client disponible</p>
						)}
					</div>
				</div>

				{/* Carte Informations produit */}
				<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
								<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
								</svg>
							</div>
							<h2 className="text-lg font-bold text-gray-900">Informations produit</h2>
						</div>
					</div>
					<div className="p-6">
						{/* Utiliser les données du produit chargé ou celles de account.product */}
						{(product || (account.product && account.productId)) ? (
							<dl className="space-y-4">
								<div>
									<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Produit</dt>
									<dd>
										<Link 
											href={`/products/${product?.id || account.product?.id || account.productId}`} 
											className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-lg"
										>
											{product?.name || account.product?.name || "Produit"}
										</Link>
									</dd>
								</div>
								<div className="flex items-center justify-between py-2 border-t border-gray-100">
									<dt className="text-sm text-gray-600">Code</dt>
									<dd className="font-mono font-semibold">{product?.code || account.product?.code || "-"}</dd>
								</div>
								<div className="flex items-center justify-between py-2 border-t border-gray-100">
									<dt className="text-sm text-gray-600">Catégorie</dt>
									<dd className="font-medium">{product?.category || account.product?.category || "-"}</dd>
								</div>
								{product?.status && (
									<div className="flex items-center justify-between py-2 border-t border-gray-100">
										<dt className="text-sm text-gray-600">Statut</dt>
										<dd>
											<Badge className={product.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
												{product.status}
											</Badge>
										</dd>
									</div>
								)}
								{account.productId && !product && (
									<div className="pt-2 border-t border-gray-100">
										<p className="text-xs text-gray-500 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Informations limitées - Chargement complet en cours...
										</p>
									</div>
								)}
							</dl>
						) : account.productId ? (
							<div className="space-y-3">
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<div className="flex items-start gap-2">
										<svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
										</svg>
										<div className="flex-1">
											<p className="text-sm font-medium text-yellow-800">Chargement en cours</p>
											<p className="text-xs text-yellow-700 mt-1">Les informations du produit sont en cours de chargement...</p>
										</div>
									</div>
								</div>
								<div className="text-center">
									<Link href={`/products/${account.productId}`} className="text-blue-600 hover:underline text-sm">
										Voir le produit #{account.productId} →
									</Link>
								</div>
							</div>
						) : (
							<p className="text-gray-400 text-center py-4">Aucune information produit disponible</p>
						)}
					</div>
				</div>

				{/* Carte Historique */}
				<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
								<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h2 className="text-lg font-bold text-gray-900">Historique</h2>
						</div>
					</div>
					<div className="p-6">
						<dl className="space-y-4">
							{account.openedAt && (
								<div className="flex items-center justify-between py-2 border-b border-gray-100">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date d'ouverture
									</dt>
									<dd className="font-medium">{new Date(account.openedAt).toLocaleString('fr-FR')}</dd>
								</div>
							)}
							{account.closedAt && (
								<div className="flex items-center justify-between py-2 border-b border-gray-100">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
										Date de fermeture
									</dt>
									<dd className="font-medium">{new Date(account.closedAt).toLocaleString('fr-FR')}</dd>
								</div>
							)}
							{account.closedReason && (
								<div className="pt-2">
									<dt className="text-sm text-gray-600 mb-2 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										Motif de fermeture
									</dt>
									<dd className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">{account.closedReason}</dd>
								</div>
							)}
							{account.createdAt && (
								<div className="flex items-center justify-between py-2 border-t border-gray-100">
									<dt className="text-xs text-gray-500">Créé le</dt>
									<dd className="text-xs text-gray-600">{new Date(account.createdAt).toLocaleString('fr-FR')}</dd>
								</div>
							)}
							{account.updatedAt && (
								<div className="flex items-center justify-between py-2 border-t border-gray-100">
									<dt className="text-xs text-gray-500">Modifié le</dt>
									<dd className="text-xs text-gray-600">{new Date(account.updatedAt).toLocaleString('fr-FR')}</dd>
								</div>
							)}
						</dl>
					</div>
				</div>
			</div>

			{/* Modales */}
			{showCloseModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
						<h3 className="text-lg font-semibold mb-4">Fermer le compte</h3>
						<p className="text-sm text-gray-600 mb-4">
							Le compte doit avoir un solde nul pour être fermé. Solde actuel: {formatCurrency(account.balance, account.currency)}
						</p>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Motif de fermeture *</label>
								<Input
									value={closeReason}
									onChange={(e) => setCloseReason(e.target.value)}
									placeholder="Raison de la fermeture..."
								/>
							</div>
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={() => { setShowCloseModal(false); setCloseReason(""); }}>
									Annuler
								</Button>
								<Button onClick={handleClose} disabled={actionLoading || !closeReason.trim()}>
									Fermer le compte
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{showFreezeModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
						<h3 className="text-lg font-semibold mb-4">Geler le compte</h3>
						<p className="text-sm text-gray-600 mb-4">
							Le gel bloque toutes les opérations sur le compte.
						</p>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Raison (optionnel)</label>
								<Input
									value={freezeReason}
									onChange={(e) => setFreezeReason(e.target.value)}
									placeholder="Raison du gel..."
								/>
							</div>
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={() => { setShowFreezeModal(false); setFreezeReason(""); }}>
									Annuler
								</Button>
								<Button onClick={handleFreeze} disabled={actionLoading}>
									Geler le compte
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{showSuspendModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
						<h3 className="text-lg font-semibold mb-4">Suspendre le compte</h3>
						<p className="text-sm text-gray-600 mb-4">
							La suspension bloque temporairement les opérations sur le compte.
						</p>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Raison (optionnel)</label>
								<Input
									value={suspendReason}
									onChange={(e) => setSuspendReason(e.target.value)}
									placeholder="Raison de la suspension..."
								/>
							</div>
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={() => { setShowSuspendModal(false); setSuspendReason(""); }}>
									Annuler
								</Button>
								<Button onClick={handleSuspend} disabled={actionLoading}>
									Suspendre le compte
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

