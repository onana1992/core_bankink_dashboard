"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { customersApi } from "@/lib/api";
import type { AddAddressRequest, Customer, DocumentType } from "@/types";

export default function CustomerDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const id = useMemo(() => Number(params?.id), [params]);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<{
		displayName: string;
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
	}>({
		displayName: "",
		firstName: "",
		lastName: "",
		email: "",
		phone: ""
	});
	const [saving, setSaving] = useState(false);

	const [addr, setAddr] = useState<AddAddressRequest>({
		type: "RESIDENTIAL",
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "FR",
		primaryAddress: true
	});
	const [addrSubmitting, setAddrSubmitting] = useState(false);

	const [docType, setDocType] = useState<DocumentType>("ID_CARD");
	const [docFile, setDocFile] = useState<File | null>(null);
	const [docSubmitting, setDocSubmitting] = useState(false);

	const [kycSubmitting, setKycSubmitting] = useState<null | "submit" | "verify" | "reject">(null);
	const [verifyRisk, setVerifyRisk] = useState<number>(20);
	const [verifyPep, setVerifyPep] = useState<boolean>(false);

	function statusBadgeVariant(status: Customer["status"]): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (status) {
			case "VERIFIED":
				return "success";
			case "DRAFT":
				return "warning";
			case "REJECTED":
			case "BLOCKED":
				return "danger";
			case "PENDING_REVIEW":
			default:
				return "info";
		}
	}

	function riskBadgeVariant(score?: number | null): "neutral" | "success" | "warning" | "danger" {
		if (typeof score !== "number") return "neutral";
		if (score >= 70) return "danger";
		if (score >= 40) return "warning";
		return "success";
	}

	async function load() {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const data = await customersApi.get(id);
			setCustomer(data);
			setFormData({
				displayName: data.displayName ?? "",
				firstName: data.firstName ?? "",
				lastName: data.lastName ?? "",
				email: data.email ?? "",
				phone: data.phone ?? ""
			});
		} catch (e: any) {
			setError(e?.message ?? "Erreur inconnue");
		} finally {
			setLoading(false);
		}
	}

	async function handleSave() {
		if (!id) return;
		setSaving(true);
		setError(null);
		try {
			const updated = await customersApi.update(id, {
				displayName: formData.displayName,
				firstName: formData.firstName || undefined,
				lastName: formData.lastName || undefined,
				email: formData.email || undefined,
				phone: formData.phone || undefined
			});
			setCustomer(updated);
			setIsEditing(false);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la sauvegarde");
		} finally {
			setSaving(false);
		}
	}

	function handleCancel() {
		if (customer) {
			setFormData({
				displayName: customer.displayName ?? "",
				firstName: customer.firstName ?? "",
				lastName: customer.lastName ?? "",
				email: customer.email ?? "",
				phone: customer.phone ?? ""
			});
		}
		setIsEditing(false);
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	async function submitAddress(e: React.FormEvent) {
		e.preventDefault();
		if (!id) return;
		setAddrSubmitting(true);
		try {
			await customersApi.addAddress(id, {
				...addr,
				primaryAddress: Boolean(addr.primaryAddress)
			});
			await load();
			setAddr(prev => ({ ...prev, line1: "", line2: "", city: "", state: "", postalCode: "" }));
		} finally {
			setAddrSubmitting(false);
		}
	}

	async function submitDocument(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !docFile) return;
		setDocSubmitting(true);
		try {
			await customersApi.uploadDocument(id, docType, docFile);
			await load();
			setDocFile(null);
		} finally {
			setDocSubmitting(false);
		}
	}

	async function doSubmitKyc() {
		if (!id) return;
		setKycSubmitting("submit");
		try {
			const c = await customersApi.submitKyc(id);
			setCustomer(c);
		} finally {
			setKycSubmitting(null);
		}
	}
	async function doVerifyKyc() {
		if (!id) return;
		setKycSubmitting("verify");
		try {
			const c = await customersApi.verifyKyc(id, { riskScore: verifyRisk, pep: verifyPep });
			setCustomer(c);
		} finally {
			setKycSubmitting(null);
		}
	}
	async function doRejectKyc() {
		if (!id) return;
		setKycSubmitting("reject");
		try {
			const c = await customersApi.rejectKyc(id);
			setCustomer(c);
		} finally {
			setKycSubmitting(null);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Client #{id}</h1>
					{error && (
						<div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
							<div className="text-sm font-medium text-red-800">Erreur</div>
							<div className="text-sm text-red-600 mt-1">{error}</div>
						</div>
					)}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => router.back()}>Retour</Button>
					<Button variant="outline" onClick={load}>Rafraîchir</Button>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4 rounded-md border bg-white p-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium">Informations</h2>
						{!isEditing && customer && (
							<Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
								Modifier
							</Button>
						)}
					</div>
					{loading && <div className="text-sm text-gray-500">Chargement...</div>}
					{customer && (
						<>
							{!isEditing ? (
								<div className="space-y-6">
									{/* Section Identité */}
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Identité</h3>
										<div className="grid grid-cols-1 gap-4 pl-2">
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Nom affiché</span>
												<span className="text-sm text-gray-900 font-semibold text-right flex-1">{customer.displayName}</span>
											</div>
											{(customer.firstName || customer.lastName) && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Nom complet</span>
													<span className="text-sm text-gray-900 text-right flex-1">
														{customer.firstName} {customer.lastName}
													</span>
												</div>
											)}
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Type</span>
												<span className="text-sm text-gray-900 text-right flex-1">
													<Badge variant={customer.type === "PERSON" ? "info" : "warning"}>{customer.type}</Badge>
												</span>
											</div>
										</div>
									</div>

									{/* Section Contact */}
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact</h3>
										<div className="grid grid-cols-1 gap-4 pl-2">
											{customer.email && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Email</span>
													<a
														href={`mailto:${customer.email}`}
														className="text-sm text-blue-600 hover:text-blue-800 text-right flex-1 break-all"
													>
														{customer.email}
													</a>
												</div>
											)}
											{customer.phone && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Téléphone</span>
													<a
														href={`tel:${customer.phone}`}
														className="text-sm text-blue-600 hover:text-blue-800 text-right flex-1"
													>
														{customer.phone}
													</a>
												</div>
											)}
										</div>
									</div>

									{/* Section KYC & Conformité */}
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">KYC & Conformité</h3>
										<div className="grid grid-cols-1 gap-4 pl-2">
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Statut</span>
												<span className="text-right flex-1">
													<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
												</span>
											</div>
											{typeof customer.riskScore === "number" && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Score de risque</span>
													<span className="text-right flex-1">
														<Badge variant={riskBadgeVariant(customer.riskScore)}>{customer.riskScore}/100</Badge>
													</span>
												</div>
											)}
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Personne PEP</span>
												<span className="text-right flex-1">
													<Badge variant={customer.pepFlag ? "danger" : "success"}>
														{customer.pepFlag ? "Oui" : "Non"}
													</Badge>
												</span>
											</div>
										</div>
									</div>

									{/* Section Métadonnées */}
									{(customer.createdAt || customer.updatedAt) && (
										<div className="space-y-3 pt-2 border-t border-gray-200">
											<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Métadonnées</h3>
											<div className="grid grid-cols-1 gap-4 pl-2">
												{customer.createdAt && (
													<div className="flex items-start justify-between py-2">
														<span className="text-sm font-medium text-gray-600 min-w-[140px]">Créé le</span>
														<span className="text-sm text-gray-500 text-right flex-1">
															{new Date(customer.createdAt).toLocaleDateString("fr-FR", {
																year: "numeric",
																month: "long",
																day: "numeric",
																hour: "2-digit",
																minute: "2-digit"
															})}
														</span>
													</div>
												)}
												{customer.updatedAt && (
													<div className="flex items-start justify-between py-2">
														<span className="text-sm font-medium text-gray-600 min-w-[140px]">Modifié le</span>
														<span className="text-sm text-gray-500 text-right flex-1">
															{new Date(customer.updatedAt).toLocaleDateString("fr-FR", {
																year: "numeric",
																month: "long",
																day: "numeric",
																hour: "2-digit",
																minute: "2-digit"
															})}
														</span>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							) : (
								<form
									onSubmit={e => {
										e.preventDefault();
										handleSave();
									}}
									className="space-y-4"
								>
									<div className="grid grid-cols-1 gap-4">
										<div>
											<label className="block text-sm font-medium mb-1">Nom affiché *</label>
											<Input
												value={formData.displayName}
												onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
												required
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">Prénom</label>
											<Input
												value={formData.firstName}
												onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">Nom de famille</label>
											<Input
												value={formData.lastName}
												onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">Email</label>
											<Input
												type="email"
												value={formData.email}
												onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">Téléphone</label>
											<Input
												value={formData.phone}
												onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
											/>
										</div>
										<div className="text-sm text-gray-500">
											<div className="font-medium mb-1">Type</div>
											<div>{customer.type}</div>
										</div>
										<div className="text-sm text-gray-500">
											<div className="font-medium mb-1">Statut</div>
											<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
										</div>
									</div>
									<div className="flex gap-2 pt-2">
										<Button type="submit" disabled={saving}>
											{saving ? "Sauvegarde..." : "Enregistrer"}
										</Button>
										<Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
											Annuler
										</Button>
									</div>
								</form>
							)}
						</>
					)}
				</div>

				<div className="space-y-4 rounded-md border bg-white p-4">
					<h2 className="text-lg font-medium">Actions KYC</h2>
					<div className="flex flex-wrap items-center gap-3">
						<Button onClick={doSubmitKyc} disabled={kycSubmitting !== null}>
							{kycSubmitting === "submit" ? "Soumission..." : "Soumettre KYC"}
						</Button>
						<div className="flex items-center gap-2">
							<label className="text-sm text-gray-600">Score</label>
							<Input
								type="number"
								className="w-24"
								value={verifyRisk}
								onChange={e => setVerifyRisk(Number(e.target.value))}
							/>
							<label className="text-sm text-gray-600">PEP</label>
							<input
								type="checkbox"
								checked={verifyPep}
								onChange={e => setVerifyPep(e.target.checked)}
							/>
							<Button onClick={doVerifyKyc} disabled={kycSubmitting !== null}>
								{kycSubmitting === "verify" ? "Vérification..." : "Vérifier"}
							</Button>
						</div>
						<Button variant="outline" onClick={doRejectKyc} disabled={kycSubmitting !== null}>
							{kycSubmitting === "reject" ? "Rejet..." : "Rejeter"}
						</Button>
					</div>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<form onSubmit={submitAddress} className="space-y-4 rounded-md border bg-white p-4">
					<h2 className="text-lg font-medium">Ajouter une adresse</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={addr.type}
								onChange={e => setAddr(prev => ({ ...prev, type: e.target.value as AddAddressRequest["type"] }))}
							>
								<option value="RESIDENTIAL">RESIDENTIAL</option>
								<option value="BUSINESS">BUSINESS</option>
								<option value="MAILING">MAILING</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Ligne 1</label>
							<Input value={addr.line1} onChange={e => setAddr(prev => ({ ...prev, line1: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm mb-1">Ligne 2</label>
							<Input value={addr.line2} onChange={e => setAddr(prev => ({ ...prev, line2: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm mb-1">Ville</label>
							<Input value={addr.city} onChange={e => setAddr(prev => ({ ...prev, city: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm mb-1">État/Province</label>
							<Input value={addr.state} onChange={e => setAddr(prev => ({ ...prev, state: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm mb-1">Code postal</label>
							<Input value={addr.postalCode} onChange={e => setAddr(prev => ({ ...prev, postalCode: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm mb-1">Pays (ISO-2)</label>
							<Input value={addr.country} onChange={e => setAddr(prev => ({ ...prev, country: e.target.value }))} />
						</div>
						<div className="flex items-center gap-2">
							<input
								id="primaryAddress"
								type="checkbox"
								checked={Boolean(addr.primaryAddress)}
								onChange={e => setAddr(prev => ({ ...prev, primaryAddress: e.target.checked }))}
							/>
							<label htmlFor="primaryAddress" className="text-sm">Adresse principale</label>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={addrSubmitting}>
							{addrSubmitting ? "Ajout..." : "Ajouter l’adresse"}
						</Button>
					</div>
				</form>

				<form onSubmit={submitDocument} className="space-y-4 rounded-md border bg-white p-4">
					<h2 className="text-lg font-medium">Uploader un document</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={docType}
								onChange={e => setDocType(e.target.value as DocumentType)}
							>
								<option value="ID_CARD">ID_CARD</option>
								<option value="PASSPORT">PASSPORT</option>
								<option value="PROOF_OF_ADDRESS">PROOF_OF_ADDRESS</option>
								<option value="REGISTRATION_DOC">REGISTRATION_DOC</option>
								<option value="SELFIE">SELFIE</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Fichier</label>
							<input
								type="file"
								onChange={e => setDocFile(e.target.files?.[0] ?? null)}
								className="block w-full text-sm"
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={!docFile || docSubmitting}>
							{docSubmitting ? "Envoi..." : "Uploader"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}


