"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
		<div className="max-w-2xl space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Nouveau client</h1>
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
							Type <span className="text-red-500">*</span>
						</label>
						<select
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={form.type}
							onChange={e => update("type", e.target.value as CustomerType)}
							required
						>
							<option value="PERSON">PERSON</option>
							<option value="BUSINESS">BUSINESS</option>
						</select>
					</div>
					<div>
						<label className="block text-sm mb-1">
							Nom d'affichage <span className="text-red-500">*</span>
						</label>
						<Input
							value={form.displayName}
							onChange={e => update("displayName", e.target.value)}
							required
						/>
					</div>
					{form.type === "PERSON" && (
						<>
							<div>
								<label className="block text-sm mb-1">Prénom</label>
								<Input
									value={form.firstName || ""}
									onChange={e => update("firstName", e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-sm mb-1">Nom de famille</label>
								<Input
									value={form.lastName || ""}
									onChange={e => update("lastName", e.target.value)}
								/>
							</div>
						</>
					)}
					<div>
						<label className="block text-sm mb-1">
							Email <span className="text-red-500">*</span>
						</label>
						<Input
							type="email"
							value={form.email}
							onChange={e => update("email", e.target.value)}
							required
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">
							Téléphone <span className="text-red-500">*</span>
						</label>
						<Input
							type="tel"
							value={form.phone}
							onChange={e => update("phone", e.target.value)}
							required
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button type="submit" disabled={submitting}>
						{submitting ? "Création..." : "Créer"}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
						Annuler
					</Button>
				</div>
			</form>
		</div>
	);
}


