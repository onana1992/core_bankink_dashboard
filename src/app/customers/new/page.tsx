"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { customersApi } from "@/lib/api";
import type { CreateCustomerRequest, CustomerType } from "@/types";

export default function NewCustomerPage() {
	const router = useRouter();
	const [form, setForm] = useState<CreateCustomerRequest>({
		type: "PERSON",
		displayName: "",
		firstName: "",
		lastName: "",
		email: "",
		phone: ""
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function update<K extends keyof CreateCustomerRequest>(key: K, value: CreateCustomerRequest[K]) {
		setForm(prev => ({ ...prev, [key]: value }));
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		
		// Validation côté client
		if (!form.displayName.trim()) {
			setError("Le nom d'affichage est requis");
			setSubmitting(false);
			return;
		}
		if (!form.email?.trim()) {
			setError("L'email est requis");
			setSubmitting(false);
			return;
		}
		if (!form.phone?.trim()) {
			setError("Le téléphone est requis");
			setSubmitting(false);
			return;
		}
		
		// Validation format email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(form.email)) {
			setError("L'email n'est pas valide");
			setSubmitting(false);
			return;
		}
		
		try {
			const created = await customersApi.create(form);
			router.push(`/customers/${created.id}`);
		} catch (e: any) {
			setError(e?.message ?? "Échec de création");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link href="/customers" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Retour à la liste des clients
				</Link>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Nouveau Client</h1>
						<p className="text-gray-600 mt-1">Créer un nouveau client bancaire</p>
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
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">1. Informations de base</h2>
					</div>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Type <span className="text-red-500">*</span>
								</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={form.type}
									onChange={e => update("type", e.target.value as CustomerType)}
									required
								>
									<option value="PERSON">Personne physique</option>
									<option value="BUSINESS">Entreprise</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Nom d'affichage <span className="text-red-500">*</span>
								</label>
								<Input
									value={form.displayName}
									onChange={e => update("displayName", e.target.value)}
									placeholder="Nom complet ou raison sociale"
									required
								/>
							</div>
						</div>
						{form.type === "PERSON" && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
									<Input
										value={form.firstName || ""}
										onChange={e => update("firstName", e.target.value)}
										placeholder="Prénom"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Nom de famille</label>
									<Input
										value={form.lastName || ""}
										onChange={e => update("lastName", e.target.value)}
										placeholder="Nom de famille"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Section 2: Coordonnées */}
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">2. Coordonnées</h2>
					</div>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Email <span className="text-red-500">*</span>
								</label>
								<Input
									type="email"
									value={form.email}
									onChange={e => update("email", e.target.value)}
									placeholder="exemple@email.com"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Téléphone <span className="text-red-500">*</span>
								</label>
								<Input
									type="tel"
									value={form.phone}
									onChange={e => update("phone", e.target.value)}
									placeholder="+33 1 23 45 67 89"
									required
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Informations contextuelles */}
				{form.type && (
					<div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
								<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h3 className="font-semibold text-gray-900 mb-1">
									Type de client : {form.type === "PERSON" ? "Personne physique" : "Entreprise"}
								</h3>
								<p className="text-sm text-gray-600">
									{form.type === "PERSON" && "Client individuel avec informations personnelles (prénom, nom)."}
									{form.type === "BUSINESS" && "Client entreprise avec raison sociale et informations commerciales."}
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
								Création...
							</>
						) : (
							<>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Créer le client
							</>
						)}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
						Annuler
					</Button>
				</div>
			</form>
		</div>
	);
}


